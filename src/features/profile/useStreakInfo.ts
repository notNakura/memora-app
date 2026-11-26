// Streak of Ajustes y cuenta (23): the local `streak` row of the
// signed-in user when it exists. The streak itself is built with the review flow; without a row the screen shows
// "Disponible cuando empieces a repasar" with no action.
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import type { SyncDatabase } from '../../services/sync/database';
import { useSession } from '../auth/session';
import type { StreakInfo } from './preferences';

export function useStreakInfo(): StreakInfo | null {
  const db: SyncDatabase = useSQLiteContext();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;
    db.getFirstAsync<{ current_days: number; freezes_available: number }>(
      'SELECT current_days, freezes_available FROM streak WHERE student_id = ?',
      [userId],
    )
      .then((row) => {
        if (!cancelled) setStreak(row ? { currentDays: row.current_days, freezesAvailable: row.freezes_available } : null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [db, userId]);

  return streak;
}
