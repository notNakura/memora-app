import { Stack } from 'expo-router';
import { useSession } from '../../features/auth/session';
import { useApplyVibrationPreference } from '../../features/profile/routes';
import { SyncRunner } from '../../services/sync/SyncRunner';
import { colors } from '../../theme';

export default function SignedInLayout() {
  const { user } = useSession();
  // The vibration setting (Ajustes, RNF-15) applies from launch, not only once Perfil or Ajustes opens.
  useApplyVibrationPreference(user ?? null);
  return (
    <>
      <SyncRunner />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.appBackground } }} />
    </>
  );
}
