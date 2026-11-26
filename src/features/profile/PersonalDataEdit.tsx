// "Datos personales y contraseña" of screen 23 (RF-56): only the
// optional birth date and sex change here; cédula and names are shown but not editable. Saving reuses
// PUT /me/profile through the session, which needs the unchanged cédula and names too.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../components/Button3D';
import { DateField } from '../../components/form/DateField';
import { SelectField, type SelectOption } from '../../components/form/SelectField';
import { Notice } from '../../components/Notice';
import type { Sex, User } from '../../services/api/client';
import { colors, fonts, spacing, typography } from '../../theme';
import { ScreenHeader } from '../onboarding/ScreenHeader';
import { errorMessage } from './usePreferenceState';

export type PersonalDataChange = { birthDate: string | null; sex: Sex | null };

// Same options as step 3 (PersonalDataScreen).
const sexOptions: SelectOption<Sex>[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'unspecified', label: 'Prefiero no decirlo' },
];

// app_user.birth_date CHECK (birth_date >= '1920-01-01')
const MIN_BIRTH_DATE = new Date(1920, 0, 1);

type Props = {
  user: User;
  onSave: (data: PersonalDataChange) => Promise<void>;
  /** Back to Ajustes y cuenta, after saving or with "Volver". */
  onDone: () => void;
};

export function PersonalDataEdit({ user, onSave, onDone }: Props) {
  const [birthDate, setBirthDate] = useState<string | null>(user.birthDate);
  const [sex, setSex] = useState<Sex | null>(user.sex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = [user.firstNames, user.lastNames].filter(Boolean).join(' ');

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await onSave({ birthDate, sex });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Datos personales" onBack={onDone} />

        <View style={styles.fixed}>
          <View style={styles.fixedRow}>
            <Text style={typography.label}>Cédula de identidad</Text>
            <Text style={styles.fixedValue}>{user.nationalId ?? '—'}</Text>
          </View>
          <View style={styles.fixedRow}>
            <Text style={typography.label}>Nombres y apellidos</Text>
            <Text style={styles.fixedValue}>{name || '—'}</Text>
          </View>
          <Text style={typography.secondary}>
            Para corregir tu cédula o tu nombre, escribe al administrador de tu institución.
          </Text>
        </View>

        <View style={styles.twoColumns}>
          <DateField
            label="Fecha de nacimiento"
            value={birthDate}
            onChange={setBirthDate}
            minimumDate={MIN_BIRTH_DATE}
            maximumDate={new Date()}
          />
          <SelectField<Sex> label="Sexo" value={sex} options={sexOptions} onChange={setSex} />
        </View>
        <Text style={typography.secondary}>
          La fecha de nacimiento y el sexo son opcionales. Sirven para dirigirnos a ti correctamente en los mensajes
          y para estadísticas generales; tu profesor no los ve.
        </Text>

        <View style={styles.footer}>
          {error ? <Notice tone="error" message={error} /> : null}
          <Button3D label={busy ? 'Guardando…' : 'Guardar'} onPress={submit} disabled={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, paddingBottom: 28, gap: 18 },
  fixed: { gap: 12 },
  fixedRow: { gap: 4 },
  fixedValue: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textOnDark },
  twoColumns: { flexDirection: 'row', gap: 12 },
  footer: { marginTop: 'auto', gap: 12 },
});
