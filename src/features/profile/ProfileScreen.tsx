// Pantalla 21 · Perfil (docs/04_pantallas.md:31, RF-26):
// sync status, extended time, retention goal and links to Mis instituciones (22) and Ajustes y cuenta (23).
// Visual reference: design/pantallas_html/21_Perfil.html
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tapFeedback } from '../../components/feedback';
import { Notice } from '../../components/Notice';
import { OptionRow } from '../../components/OptionRow';
import { Surface3D } from '../../components/Surface3D';
import type { User } from '../../services/api/client';
import type { PreferencesPatch } from '../../services/api/profile';
import { colors, depth, fonts, radius, spacing } from '../../theme';
import { TAB_BAR_SPACE } from '../shell/ShellPlaceholder';
import {
  EXTENDED_TIME_FACTOR,
  initialsOf,
  RETENTION_OPTIONS,
  syncStatusText,
  type SyncStatus,
} from './preferences';
import { LinkRow, PillButton, RowGroup } from './SettingRows';
import { usePreferenceState } from './usePreferenceState';

type Props = {
  user: User;
  /** "Estudiante · Sección 1 · SI3", or null without an active role. */
  subtitle: string | null;
  sync: SyncStatus;
  onSync: () => void;
  onSavePreferences: (patch: PreferencesPatch) => Promise<void>;
  onOpenInstitutions: () => void;
  onOpenSettings: () => void;
};

const percent = (value: number) => `${Math.round(value * 100)} %`;

export function ProfileScreen({ user, subtitle, sync, onSync, onSavePreferences, onOpenInstitutions, onOpenSettings }: Props) {
  const { preferences, save, error } = usePreferenceState(user, onSavePreferences);
  const name = [user.firstNames, user.lastNames].filter(Boolean).join(' ') || user.email;
  const syncText = syncStatusText(sync);
  const extended = preferences.timeFactor > 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.person}>
          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.avatarText}>{initialsOf(user)}</Text>
          </View>
          <View style={styles.personTexts}>
            <Text accessibilityRole="header" style={styles.name}>
              {name}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        <Surface3D tone="mint" depth={depth.button} radius={radius.field} faceStyle={styles.syncFace}>
          <View style={styles.syncTexts} accessible accessibilityLabel={`${syncText.title}. ${syncText.detail}`}>
            <Text style={styles.syncTitle}>{syncText.title}</Text>
            <Text style={styles.syncDetail}>{syncText.detail}</Text>
          </View>
          <PillButton label={sync.syncing ? 'Sincronizando…' : 'Sincronizar'} disabled={sync.syncing} onPress={onSync} />
        </Surface3D>

        {error ? <Notice tone="error" message={error} /> : null}

        <View style={styles.block} accessibilityRole="radiogroup" accessibilityLabel="Tiempo en retos y evaluaciones">
          <Text style={styles.sectionTitle}>Tiempo en retos y evaluaciones</Text>
          <OptionRow
            title="Tiempo normal"
            description="El que configure el profesor"
            selected={!extended}
            onPress={() => extended && save({ timeFactor: 1 })}
          />
          <OptionRow
            title="Tiempo extendido"
            description="50 % más de tiempo en cada pregunta"
            selected={extended}
            onPress={() => !extended && save({ timeFactor: EXTENDED_TIME_FACTOR })}
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Meta de retención</Text>
          <Text style={styles.help}>Una meta más alta programa repasos más seguidos.</Text>
          <View style={styles.retention} accessibilityRole="radiogroup" accessibilityLabel="Meta de retención">
            {RETENTION_OPTIONS.map((value) => (
              <RetentionOption
                key={value}
                label={percent(value)}
                selected={Math.abs(preferences.desiredRetention - value) < 0.001}
                onPress={() => save({ desiredRetention: value })}
              />
            ))}
          </View>
        </View>

        <RowGroup>
          <LinkRow label="Mis instituciones" onPress={onOpenInstitutions} />
          <LinkRow label="Ajustes y cuenta" onPress={onOpenSettings} />
        </RowGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

function RetentionOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPressIn={tapFeedback}
      onPress={() => !selected && onPress()}
      style={styles.retentionTouch}
    >
      {({ pressed }) => (
        <Surface3D
          tone={selected ? 'white' : 'dark'}
          depth={depth.button}
          radius={radius.pill}
          pressed={pressed}
          faceStyle={styles.retentionFace}
        >
          <Text style={[styles.retentionText, { color: selected ? colors.textOnLight : colors.textOnDark }]}>{label}</Text>
        </Surface3D>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, paddingBottom: TAB_BAR_SPACE, gap: 20 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.display, fontSize: 24, color: colors.textOnLight },
  personTexts: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.display, fontSize: 26, color: colors.textOnDark },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondaryOnDark },
  syncFace: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 18 },
  syncTexts: { flex: 1 },
  syncTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textOnLight },
  syncDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.textOnLight },
  block: { gap: 10 },
  sectionTitle: { fontFamily: fonts.displaySemi, fontSize: 22, color: colors.textOnDark },
  help: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondaryOnDark },
  retention: { flexDirection: 'row', gap: 8 },
  retentionTouch: { flex: 1 },
  retentionFace: { height: 48, alignItems: 'center', justifyContent: 'center', flexGrow: 0 },
  retentionText: { fontFamily: fonts.displaySemi, fontSize: 16 },
});
