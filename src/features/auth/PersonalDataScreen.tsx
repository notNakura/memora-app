// Pantalla 03 · Completa tus datos, paso 3 de 3 (CU-01, RF-01, RF-56). Completes the profile.
// Visual reference: design/pantallas_png/03_Completa_tus_datos.png
// No back button: the email is already verified, so step 2 has nothing left to do.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../components/Button3D';
import { DateField } from '../../components/form/DateField';
import { SelectField, type SelectOption } from '../../components/form/SelectField';
import { TextField } from '../../components/form/TextField';
import { Notice } from '../../components/Notice';
import { ApiError, type ProfileInput, type Sex, type User } from '../../services/api/client';
import { colors, fonts, spacing, typography } from '../../theme';
import { validatePersonalData, type FieldErrors } from './validation';

export type PersonalData = ProfileInput;

const sexOptions: SelectOption<Sex>[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'unspecified', label: 'Prefiero no decirlo' },
];

// app_user.birth_date CHECK (birth_date >= '1920-01-01')
const MIN_BIRTH_DATE = new Date(1920, 0, 1);

type Props = {
  /** Signed-in user; data preloaded from an institution's roster comes filled in. */
  user: User;
  onCreateAccount: (data: PersonalData) => Promise<void>;
};

/** Institution whose roster has this verified email (its memberships are still `invited`). */
function rosterInstitution(user: User) {
  if (!user.nationalId) return null;
  return user.memberships.find((m) => m.status === 'invited')?.institutionName ?? null;
}

export function PersonalDataScreen({ user, onCreateAccount }: Props) {
  const [nationalId, setNationalId] = useState(user.nationalId ?? '');
  const [firstNames, setFirstNames] = useState(user.firstNames ?? '');
  const [lastNames, setLastNames] = useState(user.lastNames ?? '');
  const [birthDate, setBirthDate] = useState<string | null>(user.birthDate);
  const [sex, setSex] = useState<Sex | null>(user.sex);
  const roster = rosterInstitution(user);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const found = validatePersonalData({ nationalId, firstNames, lastNames });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await onCreateAccount({ nationalId, firstNames: firstNames.trim(), lastNames: lastNames.trim(), birthDate, sex });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NATIONAL_ID_TAKEN') {
        // CU-01 8b / 8a: cannot continue. The field says why; the form message gives the advice
        // (recover the password, or ask the institution to fix the email in its list).
        const short = err.fields.nationalId;
        setErrors({ nationalId: short ?? err.message });
        if (short && short !== err.message) setFormError(err.message);
      } else if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError('Ocurrió un error inesperado. Intenta de nuevo.');
      }
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titles}>
          <Text accessibilityRole="header" style={styles.title}>
            Completa tus datos
          </Text>
          <Text style={typography.secondary}>Crear cuenta · paso 3 de 3</Text>
        </View>

        {roster ? (
          <Notice message={`Tu correo está en la lista de inscritos de la ${roster}: tus datos ya están cargados. Revísalos.`} />
        ) : null}

        <TextField
          label="Cédula de identidad"
          value={nationalId}
          onChangeText={setNationalId}
          error={errors.nationalId}
          placeholder="V-20.000.001"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TextField
          label="Nombres"
          value={firstNames}
          onChangeText={setFirstNames}
          error={errors.firstNames}
          autoCapitalize="words"
          autoComplete="name-given"
          textContentType="givenName"
        />
        <TextField
          label="Apellidos"
          value={lastNames}
          onChangeText={setLastNames}
          error={errors.lastNames}
          autoCapitalize="words"
          autoComplete="name-family"
          textContentType="familyName"
        />

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
          {formError ? <Notice tone="error" message={formError} /> : null}
          <Button3D label={busy ? 'Creando cuenta…' : 'Crear cuenta'} onPress={submit} disabled={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, paddingBottom: 28, gap: 16 },
  titles: { flexShrink: 1 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.textOnDark },
  twoColumns: { flexDirection: 'row', gap: 10 },
  footer: { marginTop: 'auto', gap: 12 },
});
