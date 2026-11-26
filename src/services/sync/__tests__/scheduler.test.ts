import type { SyncOutcome } from '../syncNow';
import { startAutoSync, type AppStateLike } from '../scheduler';

const outcome = (over: Partial<SyncOutcome> = {}): SyncOutcome => ({
  result: 'success',
  offline: false,
  sent: 0,
  received: 0,
  conflicts: 0,
  rejected: 0,
  notices: [],
  ...over,
});

function fakeAppState() {
  let listener: ((state: string) => void) | null = null;
  const appState: AppStateLike = {
    addEventListener: (_type, l) => {
      listener = l;
      return { remove: () => (listener = null) };
    },
  };
  return { appState, emit: (s: string) => listener?.(s), hasListener: () => listener !== null };
}

const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => jest.useFakeTimers({ doNotFake: ['setImmediate'] }));
afterEach(() => jest.useRealTimers());

describe('startAutoSync (app start, back to foreground, retries with backoff; no NetInfo)', () => {
  it('syncs on start and each time the app returns to the foreground', async () => {
    const run = jest.fn(async () => outcome());
    const { appState, emit, hasListener } = fakeAppState();
    const auto = startAutoSync({ run, appState });
    await flush();
    expect(run).toHaveBeenCalledTimes(1);

    emit('background');
    emit('active');
    await flush();
    expect(run).toHaveBeenCalledTimes(2);

    auto.stop();
    expect(hasListener()).toBe(false);
  });

  it('retries with growing delays while offline and stops retrying after a success', async () => {
    const results = [outcome({ result: 'failed', offline: true }), outcome({ result: 'failed', offline: true }), outcome()];
    const run = jest.fn(async () => results.shift() ?? outcome());
    const { appState } = fakeAppState();
    startAutoSync({ run, appState, retryDelaysMs: [1000, 5000] });
    await flush();
    expect(run).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(999);
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    await flush();
    expect(run).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(5000);
    await flush();
    expect(run).toHaveBeenCalledTimes(3);

    jest.advanceTimersByTime(60_000);
    await flush();
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('syncNow runs a manual sync and returns its outcome', async () => {
    const run = jest.fn(async () => outcome({ received: 4 }));
    const { appState } = fakeAppState();
    const auto = startAutoSync({ run, appState });
    await expect(auto.syncNow()).resolves.toMatchObject({ received: 4 });
  });
});
