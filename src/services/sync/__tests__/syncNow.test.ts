/**
 * @jest-environment node
 */
import { ApiError, NETWORK_ERROR_MESSAGE } from '../../api/client';
import type { PullResponse, PushRequest, PushResponse, SyncApi } from '../../api/sync';
import { openNodeDb, seedTwoInstitutions } from '../__fixtures__/nodeDb';
import { isInstitutionReadOnly, recordChange } from '../recordChange';
import { syncNow } from '../syncNow';

const call = <T,>(fn: (token: string) => Promise<T>) => fn('token-1');

const emptyPull = (cursor: string, tables: PullResponse['tables'] = {}): PullResponse => ({ cursor, tables });

/** Fake API that records the order of calls. */
function fakeApi(options: { push?: (body: PushRequest) => PushResponse; pulls?: PullResponse[]; offline?: boolean }) {
  const calls: string[] = [];
  const pushed: PushRequest[] = [];
  const sinces: (string | null)[] = [];
  const pulls = [...(options.pulls ?? [])];
  const api: SyncApi = {
    async push(token, body) {
      calls.push(`push:${token}`);
      if (options.offline) throw new ApiError(0, 'NETWORK', NETWORK_ERROR_MESSAGE);
      pushed.push(body);
      return options.push
        ? options.push(body)
        : { results: body.changes.map((c) => ({ id: c.id, status: 'applied' as const })), conflicts: 0 };
    },
    async pull(token, since) {
      calls.push(`pull:${token}`);
      if (options.offline) throw new ApiError(0, 'NETWORK', NETWORK_ERROR_MESSAGE);
      sinces.push(since);
      return pulls.shift() ?? emptyPull('2026-11-20T12:00:00.000000');
    },
  };
  return { api, calls, pushed, sinces };
}

const review = (id: string, cardId: number) => ({
  review_id: id,
  student_id: 3,
  card_id: cardId,
  occurred_at: '2026-11-20 10:00:00',
  source: 'review',
  rating: 3,
  applied_rating: 3,
  response_time_ms: 4000,
  new_stability: 7.5,
  new_difficulty: 5,
});

const deps = (db: Awaited<ReturnType<typeof openNodeDb>>['db'], api: SyncApi) => ({
  db,
  api,
  call,
  userId: 3,
  device: 'Android – Memora',
});

describe('syncNow', () => {
  it('pushes pending changes, then pulls, clears applied ones, keeps rejected ones with their reason and logs the run', async () => {
    const { raw, db, all } = await openNodeDb();
    seedTwoInstitutions(raw);
    await recordChange(db, 'review_log', 'r1', 'insert', review('r1', 10));
    await recordChange(db, 'review_log', 'r2', 'insert', review('r2', 10));
    await recordChange(db, 'review_log', 'r3', 'insert', review('r3', 20));
    await recordChange(db, 'deck', 'draft-1', 'insert', { subject_id: 1, name: 'Borrador' }); // online-only: not pushed

    const { api, calls, pushed } = fakeApi({
      push: (body) => ({
        results: [
          { id: body.changes[0].id, status: 'applied' },
          { id: body.changes[1].id, status: 'duplicate' },
          { id: body.changes[2].id, status: 'rejected', reason: 'No encontramos el registro relacionado con este cambio.' },
        ],
        conflicts: 1,
      }),
      pulls: [
        emptyPull('2026-11-20T12:00:00.000000', {
          notification: [
            { notification_id: 7, user_id: 3, type: 'review_due', title: 'Hoy', body: 'Repasa', link: null, created_at: '2026-11-20T11:00:00', read_at: null },
          ],
        }),
      ],
    });

    const outcome = await syncNow(deps(db, api));

    expect(calls).toEqual(['push:token-1', 'pull:token-1']);
    expect(pushed[0].device).toBe('Android – Memora');
    expect(pushed[0].changes.map((c) => [c.table, c.recordId, c.op])).toEqual([
      ['review_log', 'r1', 'insert'],
      ['review_log', 'r2', 'insert'],
      ['review_log', 'r3', 'insert'],
    ]);
    expect(pushed[0].changes[0].payload).toEqual(review('r1', 10));
    expect(outcome).toMatchObject({ result: 'partial', offline: false, sent: 3, received: 1, conflicts: 1, rejected: 1 });

    expect(all('SELECT table_name, record_id, rejected_reason FROM pending_change ORDER BY change_id')).toEqual([
      { table_name: 'review_log', record_id: 'r3', rejected_reason: 'No encontramos el registro relacionado con este cambio.' },
      { table_name: 'deck', record_id: 'draft-1', rejected_reason: null },
    ]);
    expect(all('SELECT title FROM notification')).toEqual([{ title: 'Hoy' }]);
    expect(all('SELECT user_id, device, records_sent, records_received, conflicts, result, cursor FROM sync_log')).toEqual([
      {
        user_id: 3,
        device: 'Android – Memora',
        records_sent: 3,
        records_received: 1,
        conflicts: 1,
        result: 'partial',
        cursor: '2026-11-20T12:00:00.000000',
      },
    ]);
  });

  it('sends the last cursor on the next pull and does not resend rejected changes', async () => {
    const { raw, db } = await openNodeDb();
    seedTwoInstitutions(raw);
    const first = fakeApi({ pulls: [emptyPull('2026-11-20T12:00:00.000000')] });
    await syncNow(deps(db, first.api));
    raw.exec(
      "INSERT INTO pending_change (table_name, record_id, operation, payload_json, rejected_reason) VALUES ('review_log', 'x', 'insert', '{}', 'motivo')",
    );

    const second = fakeApi({});
    const outcome = await syncNow(deps(db, second.api));

    expect(second.calls).toEqual(['pull:token-1']); // nothing to push
    expect(second.sinces).toEqual(['2026-11-20T12:00:00.000000']);
    expect(outcome).toMatchObject({ result: 'success', sent: 0 });
  });

  it('without network keeps the whole queue, logs a failed run and reports offline', async () => {
    const { raw, db, all } = await openNodeDb();
    seedTwoInstitutions(raw);
    await recordChange(db, 'review_log', 'r1', 'insert', review('r1', 10));
    const { api } = fakeApi({ offline: true });

    const outcome = await syncNow(deps(db, api));

    expect(outcome).toMatchObject({ result: 'failed', offline: true, sent: 0, received: 0 });
    expect(all('SELECT record_id, rejected_reason FROM pending_change')).toEqual([{ record_id: 'r1', rejected_reason: null }]);
    expect(all('SELECT result, cursor FROM sync_log')).toEqual([{ result: 'failed', cursor: null }]);
  });

  it('leaves a suspended institution read-only and tells the user', async () => {
    const { raw, db } = await openNodeDb();
    seedTwoInstitutions(raw);
    const { api } = fakeApi({
      pulls: [
        emptyPull('c1', {
          institution: [
            { institution_id: 1, name: 'UNERG', type: 'university', join_code: 'UNERGK26', join_mode: 'approval', status: 'suspended', created_by: 1, created_at: '2026-09-14T08:00:00', code_expires_at: null },
            { institution_id: 2, name: 'Academia Llanos', type: 'course', join_code: 'LLANS7K9', join_mode: 'open', status: 'active', created_by: 2, created_at: '2026-09-14T08:00:00', code_expires_at: null },
          ],
          membership: [
            { membership_id: 5, user_id: 3, institution_id: 1, area_id: null, role: 'student', status: 'active', approved_by: null, created_at: '2026-09-14T08:00:00' },
            { membership_id: 8, user_id: 3, institution_id: 2, area_id: null, role: 'student', status: 'active', approved_by: null, created_at: '2026-09-14T08:00:00' },
          ],
        }),
      ],
    });

    const outcome = await syncNow(deps(db, api));

    expect(await isInstitutionReadOnly(db, 1)).toBe(true);
    expect(await isInstitutionReadOnly(db, 2)).toBe(false);
    expect(outcome.notices).toEqual(['UNERG está suspendida: puedes consultar sus datos, pero no hacer cambios.']);
  });

  it('when a membership comes back removed, deletes that institution data, discards its pending changes and tells the user', async () => {
    const { raw, db, all } = await openNodeDb();
    seedTwoInstitutions(raw);
    await recordChange(db, 'review_log', 'r-unerg', 'insert', review('r-unerg', 10));
    await recordChange(db, 'review_log', 'r-academia', 'insert', review('r-academia', 20));
    const { api } = fakeApi({
      offline: false,
      // The server rejects both so they stay queued; the pull then removes institution 2.
      push: (body) => ({
        results: body.changes.map((c) => ({ id: c.id, status: 'rejected' as const, reason: 'Sin acceso.' })),
        conflicts: 0,
      }),
      pulls: [
        emptyPull('c1', {
          institution: [
            { institution_id: 1, name: 'UNERG', type: 'university', join_code: 'UNERGK26', join_mode: 'approval', status: 'active', created_by: 1, created_at: '2026-09-14T08:00:00', code_expires_at: null },
          ],
          membership: [
            { membership_id: 5, user_id: 3, institution_id: 1, area_id: null, role: 'student', status: 'active', approved_by: null, created_at: '2026-09-14T08:00:00' },
            { membership_id: 8, user_id: 3, institution_id: 2, area_id: null, role: 'student', status: 'removed', approved_by: null, created_at: '2026-09-14T08:00:00' },
          ],
          area: [{ area_id: 1, institution_id: 1, name: 'Sistemas' }],
          subject: [{ subject_id: 1, area_id: 1, code: 'SI3', name: 'SI III' }],
          deck: [{ deck_id: 1, author_id: 2, subject_id: 1, source_deck_id: null, name: 'Modelo ER', description: null, visibility: 'section', is_hidden: false, is_deleted: false, created_at: '2026-09-14T08:00:00', updated_at: '2026-09-14T08:00:00' }],
          card: [{ card_id: 10, deck_id: 1, unit_id: null, type: 'basic', front: 'a', back: 'b', image_url: null, version: 1, is_active: true, updated_at: '2026-09-14T08:00:00' }],
        }),
      ],
    });

    const outcome = await syncNow(deps(db, api));

    expect(all('SELECT institution_id FROM institution')).toEqual([{ institution_id: 1 }]);
    expect(all('SELECT institution_id FROM area')).toEqual([{ institution_id: 1 }]);
    expect(all('SELECT card_id FROM card')).toEqual([{ card_id: 10 }]);
    expect(all('SELECT card_id FROM card_state')).toEqual([{ card_id: 10 }]);
    expect(all('SELECT card_id FROM review_log')).toEqual([{ card_id: 10 }]);
    expect(all('SELECT institution_id FROM membership')).toEqual([{ institution_id: 1 }]);
    expect(all('SELECT record_id FROM pending_change')).toEqual([{ record_id: 'r-unerg' }]);
    expect(outcome.notices).toEqual([
      'Ya no perteneces a Academia Llanos. Borramos sus datos de este teléfono y descartamos 1 cambio sin enviar.',
    ]);
    // Booleans from the server are stored as SQLite integers.
    expect(all('SELECT is_active FROM card')).toEqual([{ is_active: 1 }]);
  });

  it('never throws: an unexpected server error becomes a failed run', async () => {
    const { raw, db } = await openNodeDb();
    seedTwoInstitutions(raw);
    const api: SyncApi = {
      push: async () => ({ results: [], conflicts: 0 }),
      pull: async () => {
        throw new ApiError(500, 'INTERNAL', 'Ocurrió un error inesperado. Intenta de nuevo.');
      },
    };
    const outcome = await syncNow(deps(db, api));
    expect(outcome).toMatchObject({ result: 'failed', offline: false, error: 'Ocurrió un error inesperado. Intenta de nuevo.' });
  });
});
