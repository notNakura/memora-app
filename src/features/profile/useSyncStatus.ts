// Sync status of Perfil (21): the latest sync_log row and the
// pending_change count of the local database, read again after every finished sync. "Sincronizar" runs one
// sync with the session's access helper; SyncRunner keeps running the automatic ones.
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { onSyncFinished, syncNow } from '../../services/sync';
import { syncApi } from '../../services/api/sync';
import type { SyncDatabase } from '../../services/sync/database';
import { deviceName } from '../../services/sync/useAutoSync';
import { useSession } from '../auth/session';
import type { SyncStatus } from './preferences';

/** SQLite CURRENT_TIMESTAMP is UTC "YYYY-MM-DD HH:MM:SS"; the screen needs an ISO date with its zone. */
const toIsoUtc = (value: string) => (/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);

async function readStatus(db: SyncDatabase): Promise<Omit<SyncStatus, 'syncing'>> {
  const last = await db.getFirstAsync<{ occurred_at: string; result: string }>(
    'SELECT occurred_at, result FROM sync_log ORDER BY sync_id DESC LIMIT 1',
    [],
  );
  const success = await db.getFirstAsync<{ occurred_at: string }>(
    "SELECT occurred_at FROM sync_log WHERE result = 'success' ORDER BY sync_id DESC LIMIT 1",
    [],
  );
  const pending = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM pending_change', []);
  return {
    // sync_log has no "offline" flag: a failed latest run is shown as "Sin conexión".
    online: last?.result !== 'failed',
    pendingReviews: pending?.n ?? 0,
    lastSyncedAt: success ? toIsoUtc(success.occurred_at) : null,
  };
}

export function useSyncStatus(): { status: SyncStatus; sync: () => Promise<void> } {
  const db: SyncDatabase = useSQLiteContext();
  const { user, withAccess } = useSession();
  const [status, setStatus] = useState<SyncStatus>({ online: true, pendingReviews: 0, lastSyncedAt: null, syncing: false });

  const refresh = useCallback(async () => {
    try {
      const read = await readStatus(db);
      setStatus((current) => ({ ...current, ...read }));
    } catch {
      // A database that is not ready keeps the previous status.
    }
  }, [db]);

  useEffect(() => {
    refresh();
    return onSyncFinished(() => {
      refresh();
    });
  }, [refresh]);

  const sync = useCallback(async () => {
    if (!user) return;
    setStatus((current) => ({ ...current, syncing: true }));
    try {
      await syncNow({ db, api: syncApi, call: withAccess, userId: user.id, device: deviceName() });
    } finally {
      setStatus((current) => ({ ...current, syncing: false }));
      await refresh();
    }
  }, [db, user, withAccess, refresh]);

  return { status, sync };
}
