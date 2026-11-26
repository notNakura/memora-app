import { useSession } from '../features/auth/session';
import { VerifyEmailScreen } from '../features/auth/VerifyEmailScreen';

/** Screen 02. Only reachable with a session whose email is not verified (root guards). */
export default function VerifyEmailRoute() {
  const { user, verifyEmail, resendCode, signOut } = useSession();
  if (!user) return null;

  return (
    <VerifyEmailScreen
      email={user.email}
      onVerify={verifyEmail}
      onResend={resendCode}
      onChangeEmail={() => signOut({ keepEmail: true })}
    />
  );
}
