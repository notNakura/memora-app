// Pantalla 33 · Registrar mi institución (RF-57, CU-33). The verified email of the account is the contact
// email and the person becomes the first administrator. A name already in use asks to confirm it is
// another institution (CU-33 4a).
// Visual reference: design/pantallas_png/33_Registrar_mi_institucion.png
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../components/Button3D';
import { TextField } from '../../components/form/TextField';
import { Notice } from '../../components/Notice';
import { OptionRow } from '../../components/OptionRow';
import { ApiError, type InstitutionType } from '../../services/api/client';
import type { RegisterInstitutionInput } from '../../services/api/onboarding';
import { colors, fonts, radius, spacing } from '../../theme';
import { UNEXPECTED_ERROR } from '../onboarding/joinCode';
import { ScreenHeader } from '../onboarding/ScreenHeader';

const NAME_REQUIRED = 'Escribe el nombre de la institución.';

const TYPES: { value: InstitutionType; title: string; description: string }[] = [
  { value: 'university', title: 'Universidad', description: 'Con áreas, lapsos y varias materias' },
  { value: 'institute', title: 'Instituto', description: 'Institutos y colegios universitarios' },
  { value: 'course', title: 'Curso', description: 'Un curso o diplomado con pocas materias' },
];

type Props = {
  /** Verified email of the account: the institution's contact email (RF-57). */
  email: string;
  onRegister: (input: RegisterInstitutionInput) => Promise<void>;
  onBack?: () => void;
};

export function RegisterInstitutionScreen({ email, onRegister, onBack }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<InstitutionType>('university');
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changeName = (text: string) => {
    setName(text);
    setNameError(null);
    setDuplicate(null);
  };

  const changeType = (next: InstitutionType) => {
    setType(next);
    setDuplicate(null);
  };

  const submit = async (confirmDuplicate: boolean) => {
    const trimmed = name.trim();
    setFormError(null);
    if (!trimmed) {
      setNameError(NAME_REQUIRED);
      return;
    }
    setNameError(null);
    setBusy(true);
    try {
      await onRegister(confirmDuplicate ? { name: trimmed, type, confirmDuplicate: true } : { name: trimmed, type });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INSTITUTION_NAME_TAKEN') {
        setDuplicate(err.message);
      } else if (err instanceof ApiError) {
        setNameError(err.fields.name ?? null);
        setFormError(err.message);
      } else {
        setFormError(UNEXPECTED_ERROR);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Registrar mi institución" onBack={onBack} fontSize={26} />
        <Text style={styles.lead}>
          Registra tu universidad, instituto o curso. Quedarás como su administrador y podrás crear áreas, cargar
          usuarios y nombrar a otros administradores.
        </Text>

        <TextField
          label="Nombre de la institución"
          value={name}
          onChangeText={changeName}
          error={nameError ?? undefined}
          placeholder="Universidad Nacional Experimental Rómulo Gallegos"
          autoCapitalize="words"
          autoComplete="organization"
          textContentType="organizationName"
        />

        <View accessibilityRole="radiogroup" accessibilityLabel="Tipo" style={styles.types}>
          <Text style={styles.label}>Tipo</Text>
          {TYPES.map((t) => (
            <OptionRow
              key={t.value}
              title={t.title}
              description={t.description}
              selected={type === t.value}
              onPress={() => changeType(t.value)}
            />
          ))}
        </View>

        <View style={styles.contact}>
          <Text style={styles.label}>Correo de contacto</Text>
          <View style={styles.contactBox}>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.chip}>Verificado</Text>
          </View>
          <Text style={styles.help}>Es el correo de tu cuenta. La institución lo usará para avisos de Memora.</Text>
        </View>

        <View style={styles.footer}>
          {duplicate ? (
            <>
              <Notice tone="error" message={duplicate} />
              <Button3D
                label="Sí, es otra institución"
                size="secondary"
                tone="dark"
                onPress={() => submit(true)}
                disabled={busy}
              />
            </>
          ) : null}
          {formError ? <Notice tone="error" message={formError} /> : null}
          <Button3D
            label={busy ? 'Registrando…' : 'Registrar institución'}
            onPress={() => submit(false)}
            disabled={busy || !!duplicate}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, paddingBottom: 28, gap: 16 },
  lead: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textSecondaryOnDark },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondaryOnDark },
  types: { gap: 8 },
  contact: { gap: 6 },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
    backgroundColor: colors.surface,
  },
  email: { flex: 1, minWidth: 160, fontFamily: fonts.body, fontSize: 15, color: colors.textOnDark },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.mint,
    color: colors.textOnLight,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  help: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondaryOnDark },
  footer: { marginTop: 'auto', gap: 12 },
});
