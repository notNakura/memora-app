// Pantalla 23 · Ajustes y cuenta (docs/04_pantallas.md:33; RF-34, RF-35, RF-37, RF-53, RF-55, RF-56):
// daily reminder, vibration, name privacy, new cards per day,
// streak freeze, sections, help, personal data and sign out. The app has no sound effects.
// Visual reference: design/pantallas_html/23_Ajustes_y_cuenta.html
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../components/Button3D';
import { setVibrationEnabled } from '../../components/feedback';
import { Notice } from '../../components/Notice';
import { Surface3D } from '../../components/Surface3D';
import type { Enrollment, User } from '../../services/api/client';
import type { PreferencesPatch } from '../../services/api/profile';
import { colors, depth, fonts, radius, spacing } from '../../theme';
import { ScreenHeader } from '../onboarding/ScreenHeader';
import { PersonalDataEdit, type PersonalDataChange } from './PersonalDataEdit';
import {
  DAILY_LIMIT_MAX,
  DAILY_LIMIT_MIN,
  formatReminderTime,
  stepDailyLimit,
  streakText,
  type StreakInfo,
} from './preferences';
import { ReminderTimeField } from './ReminderTimeField';
import { LinkRow, PillButton, RowGroup, StepperRow, SwitchRow } from './SettingRows';
import { errorMessage, usePreferenceState } from './usePreferenceState';

type Props = {
  user: User;
  /** Local streak row, or null until the first review. */
  streak: StreakInfo | null;
  /** Freezing the streak (comes with the streak itself); without it the button is not shown. */
  onFreeze?: () => void;
  onBack: () => void;
  onSavePreferences: (patch: PreferencesPatch) => Promise<void>;
  onSavePersonalData: (data: PersonalDataChange) => Promise<void>;
  onLeaveSection: (sectionId: number) => Promise<void>;
  /** Reopens the start guide (screen 4, RF-53). */
  onOpenHelp: () => void;
  onSignOut: () => void;
};

const sectionLabel = (e: Enrollment) => `${e.subjectName} · ${e.sectionName}`;

function sectionDetail(e: Enrollment): string | null {
  if (e.status === 'pending') return 'Esperando aprobación';
  if (e.status === 'invited') return 'Invitación pendiente';
  return e.teacherName ? `Prof. ${e.teacherName}` : null;
}

export function SettingsScreen(props: Props) {
  const { user, streak, onFreeze, onBack, onSavePreferences, onSavePersonalData, onLeaveSection, onOpenHelp, onSignOut } =
    props;
  const { preferences, save, error } = usePreferenceState(user, onSavePreferences);
  const [editingPersonalData, setEditingPersonalData] = useState(false);
  const [leaving, setLeaving] = useState<Enrollment | null>(null);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const sections = user.enrollments ?? [];
  const streakTexts = streakText(streak);

  if (editingPersonalData) {
    return <PersonalDataEdit user={user} onSave={onSavePersonalData} onDone={() => setEditingPersonalData(false)} />;
  }

  const changeVibration = (enabled: boolean) => {
    setVibrationEnabled(enabled);
    save({ vibrationEnabled: enabled }, () => setVibrationEnabled(!enabled));
  };

  const confirmLeave = async () => {
    if (!leaving || leaveBusy) return;
    setLeaveError(null);
    setLeaveBusy(true);
    try {
      await onLeaveSection(leaving.sectionId);
      setLeaving(null);
    } catch (err) {
      setLeaveError(errorMessage(err));
    } finally {
      setLeaveBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Ajustes y cuenta" onBack={onBack} />

        {error ? <Notice tone="error" message={error} /> : null}

        <RowGroup>
          <SwitchRow
            title="Recordatorio diario"
            detail={formatReminderTime(preferences.reminderTime)}
            value={preferences.notificationsEnabled}
            onChange={(v) => save({ notificationsEnabled: v })}
          >
            <ReminderTimeField
              title="Recordatorio diario"
              value={preferences.reminderTime}
              onChange={(hhmm) => save({ reminderTime: hhmm })}
            />
          </SwitchRow>
          <SwitchRow
            title="Vibración"
            detail="Al responder y al tocar los botones principales"
            value={preferences.vibrationEnabled}
            onChange={changeVibration}
          />
          <SwitchRow
            title="Mostrar mi nombre en mazos públicos"
            detail="Si lo apagas, aparece «Estudiante de la UNERG»"
            value={preferences.showNamePublicly}
            onChange={(v) => save({ showNamePublicly: v })}
          />
          <StepperRow
            title="Tarjetas nuevas por día"
            detail="Menos tarjetas, repasos más cortos"
            value={preferences.dailyNewLimit}
            min={DAILY_LIMIT_MIN}
            max={DAILY_LIMIT_MAX}
            onStep={(direction) => save({ dailyNewLimit: stepDailyLimit(preferences.dailyNewLimit, direction) })}
          />
        </RowGroup>

        <Surface3D tone="amber" depth={depth.button} radius={radius.field} faceStyle={styles.streakFace}>
          <View style={styles.flex} accessible accessibilityLabel={`${streakTexts.title}. ${streakTexts.detail}`}>
            <Text style={styles.streakTitle}>{streakTexts.title}</Text>
            <Text style={styles.streakDetail}>{streakTexts.detail}</Text>
          </View>
          {streak && streak.freezesAvailable > 0 && onFreeze ? (
            <PillButton label="Congelar mañana" onPress={onFreeze} />
          ) : null}
        </Surface3D>

        {sections.length > 0 ? (
          <View style={styles.sections}>
            <Text style={styles.sectionsTitle}>Mis secciones</Text>
            {sections.map((e) => {
              const detail = sectionDetail(e);
              return (
                <View key={e.sectionId} style={styles.sectionRow}>
                  <View style={styles.flex}>
                    <Text style={styles.sectionName}>{sectionLabel(e)}</Text>
                    {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
                  </View>
                  <PillButton
                    label="Salir"
                    variant="outline"
                    accessibilityLabel={`Salir de ${sectionLabel(e)}`}
                    onPress={() => {
                      setLeaveError(null);
                      setLeaving(e);
                    }}
                  />
                </View>
              );
            })}
            {leaving ? (
              <View style={styles.confirm} accessibilityLiveRegion="polite">
                <Text accessibilityRole="header" style={styles.confirmTitle}>
                  ¿Salir de {sectionLabel(leaving)}?
                </Text>
                <Text style={styles.confirmBody}>
                  Dejarás de ver sus mazos y evaluaciones. Para volver necesitarás el código de la sección.
                </Text>
                {leaveError ? <Notice tone="error" message={leaveError} /> : null}
                <Button3D
                  label={leaveBusy ? 'Saliendo…' : 'Salir de la sección'}
                  size="secondary"
                  disabled={leaveBusy}
                  onPress={confirmLeave}
                />
                <Button3D label="Cancelar" size="secondary" tone="dark" onPress={() => setLeaving(null)} />
              </View>
            ) : null}
          </View>
        ) : null}

        <RowGroup>
          <LinkRow label="Ayuda y guía de inicio" onPress={onOpenHelp} />
          <LinkRow label="Datos personales y contraseña" onPress={() => setEditingPersonalData(true)} />
        </RowGroup>

        <View style={styles.footer}>
          <Button3D label="Cerrar sesión" size="secondary" tone="dark" onPress={onSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, paddingBottom: 28, gap: 16 },
  flex: { flex: 1 },
  streakFace: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 16 },
  streakTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textOnLight },
  streakDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.textOnLight },
  sections: { gap: 8 },
  sectionsTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondaryOnDark },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
  },
  sectionName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textOnDark },
  sectionDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondaryOnDark },
  confirm: {
    gap: 10,
    padding: 16,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
  },
  confirmTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.textOnDark },
  confirmBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondaryOnDark },
  footer: { marginTop: 'auto', paddingTop: 8 },
});
