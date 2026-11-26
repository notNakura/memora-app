import { Redirect } from 'expo-router';
import { NextScreenLanding } from '../../features/auth/NextScreenLanding';
import { useSession } from '../../features/auth/session';
import { appStartRoute } from '../../features/auth/startRoute';
import {
  GuideRoute,
  JoinSectionRoute,
  MyInstitutionsRoute,
  RegisterInstitutionRoute,
} from '../../features/onboarding/routes';
import { SHELL_HREFS, shellFor } from '../../features/shell/shells';

/**
 * First signed-in screen (docs/08_navegacion.md, Arranque, plus the guide and screen 33
 * for people who register an institution). It follows the session, so it changes by itself after the guide, a join,
 * a registration or a new view chosen on screen 22. Screens 6, 24, 34 and 35 open their role shell.
 */
export default function SignedInHome() {
  const { user, signupChoice, activeInstitutionId, activeRole, signOut } = useSession();
  if (!user) return null;

  const route = appStartRoute(user, signupChoice, activeInstitutionId, activeRole);
  const shell = shellFor(route);
  if (shell) return <Redirect href={SHELL_HREFS[shell]} />;

  switch (route.name) {
    case 'guide':
      return <GuideRoute />;
    case 'joinSection':
      return <JoinSectionRoute />;
    case 'myInstitutions':
      return <MyInstitutionsRoute />;
    case 'registerInstitution':
      return <RegisterInstitutionRoute />;
    default:
      return <NextScreenLanding user={user} signupChoice={signupChoice} onSignOut={() => signOut()} />;
  }
}
