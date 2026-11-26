// Shown preferences of screens 21 and 23: the saved values of the user plus the changes being saved.
// A change shows at once; if saving fails it goes back to the saved value and the message is shown.
import { useCallback, useState } from 'react';
import { ApiError, type Preferences, type User } from '../../services/api/client';
import type { PreferencesPatch } from '../../services/api/profile';
import { UNEXPECTED_ERROR } from '../onboarding/joinCode';
import { preferencesOf } from './preferences';

export const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : UNEXPECTED_ERROR);

export function usePreferenceState(user: User, onSave: (patch: PreferencesPatch) => Promise<void>) {
  const [changes, setChanges] = useState<PreferencesPatch>({});
  const [error, setError] = useState<string | null>(null);
  const preferences: Preferences = { ...preferencesOf(user), ...changes };

  const save = useCallback(
    async (patch: PreferencesPatch, onFailure?: () => void) => {
      setError(null);
      setChanges((current) => ({ ...current, ...patch }));
      try {
        await onSave(patch);
      } catch (err) {
        setChanges((current) => {
          const next = { ...current };
          for (const key of Object.keys(patch) as (keyof PreferencesPatch)[]) delete next[key];
          return next;
        });
        onFailure?.();
        setError(errorMessage(err));
      }
    },
    [onSave],
  );

  return { preferences, save, error };
}
