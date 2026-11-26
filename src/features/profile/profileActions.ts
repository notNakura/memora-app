// Saving preferences and leaving a section (RF-35). The calls go through the
// session's `withAccess` (renews the token on 401). app_user is not an upload table of the sync engine
// (src/services/sync/tables.ts), so preferences are sent to the API directly; offline they fail with the
// network message and the screen shows it.
//
// Both routes answer the refreshed { user }. The session does not expose a way to replace its user, so the
// newest one is kept here (`useProfileUser`) until the session's own user changes (refresh, profile edit,
// sign out). If the session ever exposes `applyUser`, it is used instead.
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { User } from '../../services/api/client';
import { profileApi as defaultProfileApi, type PreferencesPatch, type ProfileApi } from '../../services/api/profile';
import { useSession } from '../auth/session';

export type ProfileActions = {
  updatePreferences(patch: PreferencesPatch): Promise<void>;
  leaveSection(sectionId: number): Promise<void>;
};

type WithAccess = <T>(call: (token: string) => Promise<T>) => Promise<T>;

export function createProfileActions(
  withAccess: WithAccess,
  applyUser: (user: User) => Promise<void> | void,
  api: ProfileApi = defaultProfileApi,
): ProfileActions {
  return {
    updatePreferences: async (patch) => {
      const { user } = await withAccess((token) => api.updatePreferences(token, patch));
      await applyUser(user);
    },
    leaveSection: async (sectionId) => {
      const { user } = await withAccess((token) => api.leaveSection(token, sectionId));
      await applyUser(user);
    },
  };
}

/** Newest user from a profile route, valid only while the session still holds `base`. */
let fresh: { base: User | null; user: User } | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => fresh;

export function keepFreshUser(base: User | null, user: User) {
  fresh = { base, user };
  listeners.forEach((l) => l());
}

/** The session's user, or the newer one a profile route received while the session still holds the old one. */
export function useProfileUser(): User | null {
  const { user } = useSession();
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  return current && current.base === user && user !== null ? current.user : user;
}

export function useProfileActions(): ProfileActions {
  const session = useSession() as ReturnType<typeof useSession> & { applyUser?: (user: User) => Promise<void> };
  const { withAccess, applyUser, user } = session;
  const apply = useCallback(
    (next: User) => (applyUser ? applyUser(next) : keepFreshUser(user, next)),
    [applyUser, user],
  );
  return useMemo(() => createProfileActions(withAccess, apply), [withAccess, apply]);
}
