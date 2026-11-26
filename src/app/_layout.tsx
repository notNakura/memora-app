import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DATABASE_NAME, migrateDbIfNeeded } from '../db/migrate';
import { SessionProvider, useSession } from '../features/auth/session';
import { startRoute } from '../features/auth/startRoute';
import { colors } from '../theme';
import { fontAssets } from '../theme/fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <SessionProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </SessionProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

/** Only the screen that matches the session exists (docs/08_navegacion.md, Arranque). */
function RootNavigator() {
  const { status, user, signupChoice } = useSession();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hide();
  }, [status]);

  if (status === 'loading') return null;
  const start = startRoute(user, signupChoice).name;
  const signedIn = start !== 'access' && start !== 'verifyEmail' && start !== 'completeProfile';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.appBackground } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={start === 'verifyEmail'}>
        <Stack.Screen name="verify-email" />
      </Stack.Protected>
      <Stack.Protected guard={start === 'completeProfile'}>
        <Stack.Screen name="complete-profile" />
      </Stack.Protected>
      <Stack.Protected guard={start === 'access'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
