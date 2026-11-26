// When to sync, without a NetInfo dependency. On start, every time the
// app returns to the foreground, on demand, and after an offline run with growing delays until one succeeds.
import { AppState } from 'react-native';
import type { SyncOutcome } from './syncNow';

export type AppStateLike = {
  addEventListener(type: 'change', listener: (state: string) => void): { remove(): void };
};

export const DEFAULT_RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];

export function startAutoSync({
  run,
  appState = AppState as unknown as AppStateLike,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
}: {
  run: () => Promise<SyncOutcome>;
  appState?: AppStateLike;
  retryDelaysMs?: number[];
}) {
  let stopped = false;
  let retries = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const syncNow = async (): Promise<SyncOutcome> => {
    if (timer) clearTimeout(timer);
    timer = null;
    const outcome = await run();
    if (stopped) return outcome;
    if (outcome.offline) {
      const delay = retryDelaysMs[Math.min(retries, retryDelaysMs.length - 1)];
      retries += 1;
      timer = setTimeout(() => void syncNow(), delay);
    } else {
      retries = 0;
    }
    return outcome;
  };

  const subscription = appState.addEventListener('change', (state) => {
    if (state === 'active') void syncNow();
  });
  void syncNow();

  return {
    /** Manual sync ("Sincronizar ahora"); never throws. */
    syncNow,
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    },
  };
}
