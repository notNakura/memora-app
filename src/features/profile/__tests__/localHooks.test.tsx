import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import type { SyncOutcome } from '../../../services/sync';

// Local database double: answers the queries of the two hooks.
type FakeDb = {
  lastLog: { occurred_at: string; result: string } | null;
  lastSuccess: { occurred_at: string } | null;
  pending: number;
  streak: { current_days: number; freezes_available: number } | null;
  getFirstAsync: jest.Mock<Promise<unknown>, [string]>;
};
const mockDb: FakeDb = {
  lastLog: null as { occurred_at: string; result: string } | null,
  lastSuccess: null as { occurred_at: string } | null,
  pending: 0,
  streak: null as { current_days: number; freezes_available: number } | null,
  getFirstAsync: jest.fn(async (sql: string): Promise<unknown> => {
    if (sql.includes('FROM pending_change')) return { n: mockDb.pending };
    if (sql.includes("result = 'success'")) return mockDb.lastSuccess;
    if (sql.includes('FROM sync_log')) return mockDb.lastLog;
    if (sql.includes('FROM streak')) return mockDb.streak;
    return null;
  }),
};
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));

let mockFinished: ((o: SyncOutcome) => void) | null = null;
const mockSyncNow = jest.fn();
jest.mock('../../../services/sync', () => ({
  onSyncFinished: (listener: (o: SyncOutcome) => void) => {
    mockFinished = listener;
    return () => {
      mockFinished = null;
    };
  },
  syncNow: (...args: unknown[]) => mockSyncNow(...args),
}));
jest.mock('../../../services/sync/useAutoSync', () => ({ deviceName: () => 'iOS – Memora' }));

const mockWithAccess = jest.fn();
jest.mock('../../auth/session', () => ({ useSession: () => ({ user: { id: 7 }, withAccess: mockWithAccess }) }));

import { useStreakInfo } from '../useStreakInfo';
import { useSyncStatus } from '../useSyncStatus';

function SyncProbe() {
  const { status, sync } = useSyncStatus();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="sync" onPress={() => sync()}>
      <Text>{JSON.stringify(status)}</Text>
    </Pressable>
  );
}

function StreakProbe() {
  return <Text>{JSON.stringify(useStreakInfo())}</Text>;
}

const outcome = (o: Partial<SyncOutcome>): SyncOutcome => ({
  result: 'success',
  offline: false,
  sent: 0,
  received: 0,
  conflicts: 0,
  rejected: 0,
  notices: [],
  ...o,
});

beforeEach(() => {
  mockDb.lastLog = null;
  mockDb.lastSuccess = null;
  mockDb.pending = 0;
  mockDb.streak = null;
  mockSyncNow.mockReset();
});

describe('useSyncStatus (latest sync_log row)', () => {
  it('reads the latest sync_log row and the pending changes', async () => {
    mockDb.lastLog = { occurred_at: '2026-11-20 18:05:00', result: 'failed' };
    mockDb.lastSuccess = { occurred_at: '2026-11-20 14:05:00' };
    mockDb.pending = 14;
    await render(<SyncProbe />);
    expect(
      await screen.findByText(
        JSON.stringify({ online: false, pendingReviews: 14, lastSyncedAt: '2026-11-20T14:05:00Z', syncing: false }),
      ),
    ).toBeTruthy();
  });

  it('refreshes after every finished sync and runs one with the session helper', async () => {
    await render(<SyncProbe />);
    mockSyncNow.mockResolvedValue(outcome({}));
    await fireEvent.press(screen.getByRole('button', { name: 'sync' }));
    expect(mockSyncNow).toHaveBeenCalledWith(
      expect.objectContaining({ db: mockDb, call: mockWithAccess, userId: 7, device: 'iOS – Memora' }),
    );

    mockDb.lastLog = { occurred_at: '2026-11-21 09:00:00', result: 'success' };
    mockDb.lastSuccess = { occurred_at: '2026-11-21 09:00:00' };
    await act(async () => mockFinished?.(outcome({})));
    expect(
      await screen.findByText(
        JSON.stringify({ online: true, pendingReviews: 0, lastSyncedAt: '2026-11-21T09:00:00Z', syncing: false }),
      ),
    ).toBeTruthy();
  });
});

describe('useStreakInfo (local streak row)', () => {
  it('is null without a row and reads current_days and freezes_available', async () => {
    const view = await render(<StreakProbe />);
    expect(await screen.findByText('null')).toBeTruthy();
    mockDb.streak = { current_days: 6, freezes_available: 1 };
    await view.unmount();
    await render(<StreakProbe />);
    expect(await screen.findByText(JSON.stringify({ currentDays: 6, freezesAvailable: 1 }))).toBeTruthy();
  });
});
