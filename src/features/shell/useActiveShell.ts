// Shell of the active view: the session's start screen (startRoute + the institution and role chosen on
// screen 22) decides it. Null before a role (guide, 5, 22, 33).
import { useSession } from '../auth/session';
import { appStartRoute } from '../auth/startRoute';
import { shellFor, type ShellName } from './shells';

export function useActiveShell(): ShellName | null {
  const { user, signupChoice, activeInstitutionId, activeRole } = useSession();
  if (!user) return null;
  return shellFor(appStartRoute(user, signupChoice, activeInstitutionId, activeRole));
}
