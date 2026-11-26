/**
 * @jest-environment node
 */
import { openNodeDb, seedTwoInstitutions } from '../__fixtures__/nodeDb';
import { isInstitutionReadOnly, READ_ONLY_MESSAGE, ReadOnlyInstitutionError, recordChange } from '../recordChange';

type Pending = { table_name: string; record_id: string; operation: string; payload_json: string };

const review = {
  review_id: '7f1f7a1e-4a8b-4c55-9a59-111111111111',
  student_id: 3,
  card_id: 10,
  occurred_at: '2026-11-20 10:00:00',
  source: 'review',
  rating: 3,
  applied_rating: 3,
  response_time_ms: 4000,
  new_stability: 7.5,
  new_difficulty: 5,
};

describe('recordChange', () => {
  it('writes the local row and queues the same change in pending_change', async () => {
    const { raw, db, all } = await openNodeDb();
    seedTwoInstitutions(raw);

    await recordChange(db, 'review_log', review.review_id, 'insert', review);

    expect(all('SELECT review_id, card_id FROM review_log')).toEqual([{ review_id: review.review_id, card_id: 10 }]);
    const pending = all<Pending>('SELECT table_name, record_id, operation, payload_json FROM pending_change');
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ table_name: 'review_log', record_id: review.review_id, operation: 'insert' });
    expect(JSON.parse(pending[0].payload_json)).toEqual(review);
  });

  it('updates and deletes by primary key, queueing each change', async () => {
    const { raw, db, all } = await openNodeDb();
    seedTwoInstitutions(raw);

    await recordChange(db, 'card_state', '3:10', 'update', {
      student_id: 3,
      card_id: 10,
      status: 'review',
      stability: 3,
      difficulty: 5,
    });
    await recordChange(db, 'deck_subscription', '3:1', 'insert', { student_id: 3, deck_id: 1 });
    await recordChange(db, 'deck_subscription', '3:1', 'delete', { student_id: 3, deck_id: 1 });

    expect(all('SELECT status, stability FROM card_state WHERE card_id = 10')).toEqual([{ status: 'review', stability: 3 }]);
    expect(all('SELECT * FROM deck_subscription')).toEqual([]);
    expect(all('SELECT operation FROM pending_change ORDER BY change_id')).toEqual([
      { operation: 'update' },
      { operation: 'insert' },
      { operation: 'delete' },
    ]);
  });

  it('returns the local id of an inserted row whose id the server assigns (error_report)', async () => {
    const { raw, db, all } = await openNodeDb();
    seedTwoInstitutions(raw);
    const id = await recordChange(db, 'error_report', null, 'insert', {
      card_id: 10,
      reporter_id: 3,
      reason: 'confusing',
    });
    expect(all('SELECT record_id FROM pending_change')).toEqual([{ record_id: String(id) }]);
  });

  it('keeps a deck draft only in pending_change: the server assigns its ids when it is published', async () => {
    const { raw, db, all } = await openNodeDb();
    seedTwoInstitutions(raw);
    await recordChange(db, 'deck', 'draft-1', 'insert', { subject_id: 1, name: 'Borrador' });
    expect(all('SELECT deck_id FROM deck ORDER BY deck_id')).toEqual([{ deck_id: 1 }, { deck_id: 2 }]);
    expect(all('SELECT table_name, record_id FROM pending_change')).toEqual([{ table_name: 'deck', record_id: 'draft-1' }]);
  });

  it('refuses tables that never live on the phone', async () => {
    const { db } = await openNodeDb();
    await expect(recordChange(db, 'audit_log', '1', 'insert', {})).rejects.toThrow(/audit_log/);
  });

  it('refuses changes in a suspended institution and writes nothing', async () => {
    const { raw, db, all } = await openNodeDb();
    seedTwoInstitutions(raw);
    raw.exec("UPDATE institution SET status = 'suspended' WHERE institution_id = 1");

    expect(await isInstitutionReadOnly(db, 1)).toBe(true);
    expect(await isInstitutionReadOnly(db, 2)).toBe(false);
    const write = recordChange(db, 'review_log', review.review_id, 'insert', review);
    await expect(write).rejects.toBeInstanceOf(ReadOnlyInstitutionError);
    await expect(write).rejects.toThrow(READ_ONLY_MESSAGE);
    expect(all('SELECT * FROM review_log')).toEqual([]);
    expect(all('SELECT * FROM pending_change')).toEqual([]);

    // Institution 2 still accepts changes.
    await recordChange(db, 'review_log', 'r2', 'insert', { ...review, review_id: 'r2', card_id: 20 });
    expect(all('SELECT count(*) AS n FROM pending_change')).toEqual([{ n: 1 }]);
  });
});
