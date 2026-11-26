// Mount once inside <SQLiteProvider> for a signed-in user: syncs on start, on return to the foreground and
// with backoff while offline; returns the manual "sync now" trigger.
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { syncApi } from '../api/sync';
import type { SyncDatabase } from './database';
import { startAutoSync } from './scheduler';
import { syncNow, type SyncDeps, type SyncOutcome } from './syncNow';

export const deviceName = () => `${Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'} – Memora`;

export function useAutoSync({ userId, call }: { userId: number | null; call: SyncDeps['call'] }) {
  const db: SyncDatabase = useSQLiteContext();
  const auto = useRef<ReturnType<typeof startAutoSync> | null>(null);
  const callRef = useRef(call);
  callRef.current = call;

  useEffect(() => {
    if (userId === null) return;
    const s = startAutoSync({
      run: () => syncNow({ db, api: syncApi, call: (fn) => callRef.current(fn), userId, device: deviceName() }),
    });
    auto.current = s;
    return () => {
      s.stop();
      auto.current = null;
    };
  }, [db, userId]);

  return useCallback(
    async (): Promise<SyncOutcome | null> => (auto.current ? auto.current.syncNow() : null),
    [],
  );
}
