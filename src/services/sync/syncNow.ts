// One sync run (docs/07_sincronizacion.md): send pending changes, receive the server's, log it in sync_log.
// It never throws: without network the queue stays and the run is logged as failed.
import { ApiError } from '../api/client';
import type { OutgoingChange, SyncApi } from '../api/sync';
import { applyPull } from './applyPull';
import { type SyncDatabase, withForeignKeysOff } from './database';
import { UPLOAD_TABLES } from './tables';

export type SyncOutcome = {
  result: 'success' | 'partial' | 'failed';
  /** The run failed because there was no connection. */
  offline: boolean;
  sent: number;
  received: number;
  conflicts: number;
  rejected: number;
  /** Spanish messages for the person (suspended or removed institutions). */
  notices: string[];
  /** Spanish message of the error that stopped the run. */
  error?: string;
};

export type SyncDeps = {
  db: SyncDatabase;
  api: SyncApi;
  /** Runs an API call with a valid access token (the session's renew-on-401 helper). */
  call: <T>(fn: (accessToken: string) => Promise<T>) => Promise<T>;
  userId: number;
  /** Shown in sync_log.device, e.g. "Android – Memora". */
  device: string;
};

const PUSH_BATCH = 200;

type PendingRow = { change_id: number; table_name: string; record_id: string; operation: string; payload_json: string };

const listeners = new Set<(outcome: SyncOutcome) => void>();
/** Subscribes to every finished run (e.g. to show its notices); returns the unsubscribe function. */
export function onSyncFinished(listener: (outcome: SyncOutcome) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function lastCursor(db: SyncDatabase) {
  const row = await db.getFirstAsync<{ cursor: string }>(
    'SELECT cursor FROM sync_log WHERE cursor IS NOT NULL ORDER BY sync_id DESC LIMIT 1', [],
  );
  return row?.cursor ?? null;
}

async function log(db: SyncDatabase, deps: SyncDeps, o: SyncOutcome, cursor: string | null) {
  // sync_log.user_id references app_user, which the first pull has not downloaded yet.
  await withForeignKeysOff(db, () =>
    db.runAsync(
      `INSERT INTO sync_log (user_id, device, records_sent, records_received, conflicts, result, cursor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [deps.userId, deps.device.slice(0, 60), o.sent, o.received, o.conflicts, o.result, cursor],
    ),
  );
}

async function run(deps: SyncDeps): Promise<SyncOutcome> {
  const { db, api, call } = deps;
  const outcome: SyncOutcome = {
    result: 'success',
    offline: false,
    sent: 0,
    received: 0,
    conflicts: 0,
    rejected: 0,
    notices: [],
  };
  let cursor: string | null = null;
  try {
    // Rejected changes stay queued with their reason but are not sent again; drafts of online-only tables
    // (deck, card, card_option) wait for the publish flow.
    const pending = await db.getAllAsync<PendingRow>(
      `SELECT change_id, table_name, record_id, operation, payload_json FROM pending_change
        WHERE rejected_reason IS NULL AND table_name IN (${UPLOAD_TABLES.map(() => '?').join(', ')})
        ORDER BY change_id`,
      [...UPLOAD_TABLES],
    );
    for (let i = 0; i < pending.length; i += PUSH_BATCH) {
      const batch = pending.slice(i, i + PUSH_BATCH);
      const changes: OutgoingChange[] = batch.map((p) => ({
        id: p.change_id,
        table: p.table_name,
        op: p.operation as OutgoingChange['op'],
        recordId: p.record_id,
        payload: JSON.parse(p.payload_json),
      }));
      const response = await call((token) => api.push(token, { device: deps.device, changes }));
      outcome.sent += batch.length;
      outcome.conflicts += response.conflicts;
      for (const r of response.results) {
        const change = batch.find((p) => p.change_id === r.id);
        if (!change) continue;
        if (r.status === 'rejected') {
          outcome.rejected += 1;
          await db.runAsync('UPDATE pending_change SET rejected_reason = ? WHERE change_id = ?', [
            r.reason ?? 'El servidor rechazó este cambio.',
            r.id,
          ]);
          continue;
        }
        await db.runAsync('DELETE FROM pending_change WHERE change_id = ?', [r.id]);
        // error_report ids are assigned by the server; adopt it locally.
        if (change.table_name === 'error_report' && r.serverId !== undefined && r.serverId !== Number(change.record_id)) {
          await withForeignKeysOff(db, () =>
            db.runAsync('UPDATE error_report SET report_id = ? WHERE report_id = ?', [r.serverId!, Number(change.record_id)]),
          );
        }
      }
    }

    const since = await lastCursor(db);
    const pull = await call((token) => api.pull(token, since));
    const applied = await applyPull(db, pull);
    outcome.received = applied.received;
    outcome.notices = applied.notices;
    outcome.result = outcome.rejected > 0 ? 'partial' : 'success';
    cursor = pull.cursor;
  } catch (err) {
    outcome.offline = err instanceof ApiError && err.code === 'NETWORK';
    outcome.result = outcome.sent > 0 ? 'partial' : 'failed';
    outcome.error = err instanceof Error ? err.message : String(err);
  }
  await log(db, deps, outcome, cursor);
  return outcome;
}

const inFlight = new WeakMap<SyncDatabase, Promise<SyncOutcome>>();

/**
 * Pushes then pulls; one run at a time per database (a second call while one runs gets the same result).
 * Never throws.
 */
export function syncNow(deps: SyncDeps): Promise<SyncOutcome> {
  const running = inFlight.get(deps.db);
  if (running) return running;
  const promise = run(deps)
    .catch(
      (err): SyncOutcome => ({
        result: 'failed',
        offline: false,
        sent: 0,
        received: 0,
        conflicts: 0,
        rejected: 0,
        notices: [],
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    .then((outcome) => {
      listeners.forEach((l) => l(outcome));
      return outcome;
    })
    .finally(() => inFlight.delete(deps.db));
  inFlight.set(deps.db, promise);
  return promise;
}
