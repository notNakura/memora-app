// Perfil (21) until its flow is built: "Desde Perfil (21) todos llegan a Mis instituciones (22) y Ajustes (23)"
// (docs/08_navegacion.md). It also keeps "Cerrar sesión" reachable.
import { StyleSheet, Text, View } from 'react-native';
import { Button3D } from '../../components/Button3D';
import type { User } from '../../services/api/client';
import { typography } from '../../theme';
import { ShellPlaceholder } from './ShellPlaceholder';

type Props = {
  user: User;
  onOpenInstitutions: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

export function ProfilePlaceholder({ user, onOpenInstitutions, onOpenSettings, onSignOut }: Props) {
  const name = [user.firstNames, user.lastNames].filter(Boolean).join(' ');
  return (
    <ShellPlaceholder title="Perfil" screens={[21]}>
      <View style={styles.person}>
        {name ? <Text style={typography.heading}>{name}</Text> : null}
        <Text style={typography.secondary}>{user.email}</Text>
      </View>
      <View style={styles.actions}>
        <Button3D label="Mis instituciones" tone="dark" onPress={onOpenInstitutions} />
        <Button3D label="Ajustes" tone="dark" onPress={onOpenSettings} />
        <Button3D label="Cerrar sesión" size="secondary" tone="dark" onPress={onSignOut} />
      </View>
    </ShellPlaceholder>
  );
}

const styles = StyleSheet.create({
  person: { gap: 4 },
  actions: { gap: 12, marginTop: 8 },
});
