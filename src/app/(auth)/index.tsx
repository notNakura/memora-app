import { AuthScreen } from '../../features/auth/AuthScreen';
import { useSession } from '../../features/auth/session';

/** Screen 01. Creating the account opens screen 02 by itself: the root guards follow the session. */
export default function AccessRoute() {
  const { signIn, register, lastEmail } = useSession();

  return (
    <AuthScreen
      initialEmail={lastEmail}
      onSignIn={signIn}
      onRegister={register}
      // Password recovery (RF-36) needs email delivery on the server; pending.
      onForgotPassword={() => undefined}
    />
  );
}
