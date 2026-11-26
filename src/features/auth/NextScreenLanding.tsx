// TEMPORARY landing once registration is done, until screens 5, 6, 22, 24, 34 and 35 exist.
// Says which screen the start routing chose so the flow can be checked by hand.
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../components/Button3D';
import { Memo } from '../../components/Memo';
import { Notice } from '../../components/Notice';
import type { User } from '../../services/api/client';
import type { SignupChoice } from '../../services/signupChoiceStore';
import { colors, spacing, typography } from '../../theme';
import { startRoute, type StartRoute } from './startRoute';

const SCREEN_TITLES: Record<StartRoute['name'], string> = {
  access: 'Ingreso',
  verifyEmail: 'Verifica tu correo',
  completeProfile: 'Completa tus datos',
  joinSection: 'Unirse a una sección',
  studentHome: 'Inicio del estudiante',
  myInstitutions: 'Mis instituciones',
  teacherDashboard: 'Panel docente',
  institutionAdmin: 'Áreas y administradores',
  academicManagement: 'Gestión académica',
};

type Props = { user: User; signupChoice: SignupChoice | null; onSignOut: () => void };

export function NextScreenLanding({ user, signupChoice, onSignOut }: Props) {
  const next = startRoute(user, signupChoice);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Memo pose="celebrating" size={120} />
        <Text accessibilityRole="header" style={typography.title}>
          Hola, {user.firstNames}
        </Text>
        <Text style={typography.secondary}>Sesión iniciada con {user.email}</Text>
        <Notice message={`Siguiente pantalla: ${SCREEN_TITLES[next.name]} (${next.screen}). Aún no está disponible.`} />
        <View style={styles.footer}>
          <Button3D label="Cerrar sesión" size="secondary" tone="dark" onPress={onSignOut} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flex: 1, padding: spacing.screenX, gap: 16, alignItems: 'flex-start' },
  footer: { marginTop: 'auto', alignSelf: 'stretch' },
});
