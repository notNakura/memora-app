import { PersonalDataScreen } from '../features/auth/PersonalDataScreen';
import { useSession } from '../features/auth/session';

/** Screen 03. Only reachable with a verified email and no personal data yet (root guards). */
export default function CompleteProfileRoute() {
  const { user, completeProfile } = useSession();
  if (!user) return null;

  return <PersonalDataScreen user={user} onCreateAccount={completeProfile} />;
}
