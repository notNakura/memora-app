// Loading and action state shared by the admin screens: one error message and one busy flag.
import { useCallback, useState } from 'react';
import { ApiError } from '../../services/api/client';
import { UNEXPECTED_ERROR } from '../onboarding/joinCode';

export const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : UNEXPECTED_ERROR);

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Runs the call; on failure keeps the server's Spanish message and returns undefined. */
  const run = useCallback(async <T,>(work: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await work();
    } catch (err) {
      setError(errorMessage(err));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
