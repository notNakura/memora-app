// Pantalla 22 · Mis instituciones (RF-59, CU-35). Choose the active institution (kept on the phone),
// join another one with its 8-character code (a 6-character section code opens screen 5) or register one (33).
// An institution where the person holds several roles shows one row per role: choosing one switches the view
// (docs/08_navegacion.md, Arranque).
// Visual reference: design/pantallas_png/22_Mis_instituciones.png
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../components/Button3D';
import { FieldError } from '../../components/form/FieldError';
import { Notice } from '../../components/Notice';
import { OptionRow } from '../../components/OptionRow';
import type { InstitutionType, Membership, MembershipRole, User } from '../../services/api/client';
import type { JoinOutcome, JoinRole } from '../../services/api/onboarding';
import type { SignupChoice } from '../../services/signupChoiceStore';
import { colors, fonts, radius, spacing } from '../../theme';
import {
  CODE_ALPHABET_ERROR,
  INSTITUTION_CODE_LENGTH,
  INSTITUTION_OUTCOME_MESSAGES,
  isValidCodeAlphabet,
  joinErrorMessage,
  normalizeCode,
  SECTION_CODE_LENGTH,
} from '../onboarding/joinCode';
import { PendingList } from '../onboarding/PendingList';
import { ScreenHeader } from '../onboarding/ScreenHeader';

const CODE_LENGTH_ERROR = 'Escribe un código de 6 u 8 caracteres.';

export const ROLE_LABELS: Record<MembershipRole, string> = {
  student: 'Estudiante',
  teacher: 'Profesor',
  area_admin: 'Administrador de área',
  institution_admin: 'Administrador',
};

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  university: 'Universidad',
  institute: 'Instituto',
  course: 'Curso',
};

/** Widest scope first, like the start routing. */
const ROLE_ORDER: MembershipRole[] = ['institution_admin', 'area_admin', 'teacher', 'student'];

type InstitutionRow = {
  key: string;
  id: number;
  name: string;
  description: string;
  role: MembershipRole;
  /** The widest role of its institution: selected when no role was chosen. */
  widest: boolean;
  /** Only rows of an institution with several roles send their role. */
  sendsRole: boolean;
};

const rowDescription = (m: Membership) => {
  const parts = [ROLE_LABELS[m.role]];
  if (m.institutionType) parts.push(INSTITUTION_TYPE_LABELS[m.institutionType]);
  if (m.sectionCount != null) parts.push(`${m.sectionCount} ${m.sectionCount === 1 ? 'sección' : 'secciones'}`);
  return parts.join(' · ');
};

/** One row per active role of each institution, widest role first. */
function activeInstitutions(memberships: Membership[]): InstitutionRow[] {
  const byInstitution = new Map<number, Membership[]>();
  for (const m of memberships.filter((m) => m.status === 'active')) {
    const list = byInstitution.get(m.institutionId) ?? [];
    if (!list.some((other) => other.role === m.role)) byInstitution.set(m.institutionId, [...list, m]);
  }
  return [...byInstitution.values()].flatMap((list) =>
    [...list]
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
      .map((m, index) => ({
        key: `${m.institutionId}-${m.role}`,
        id: m.institutionId,
        name: m.institutionName,
        description: rowDescription(m),
        role: m.role,
        widest: index === 0,
        sendsRole: list.length > 1,
      })),
  );
}

type Props = {
  user: User;
  activeInstitutionId: number | null;
  /** Role chosen for the active institution, or null (its widest role is the selected row). */
  activeRole?: MembershipRole | null;
  signupChoice: SignupChoice | null;
  /** `role` is sent only for an institution where the person holds several roles. */
  onSelect: (institutionId: number, role?: MembershipRole) => Promise<void>;
  onJoinInstitution: (code: string, role: JoinRole) => Promise<JoinOutcome>;
  /** A 6-character code belongs to a section: screen 5 opens with it. */
  onSectionCode: (code: string) => void;
  onRegisterInstitution: () => void;
  onBack?: () => void;
};

export function MyInstitutionsScreen({
  user,
  activeInstitutionId,
  activeRole = null,
  signupChoice,
  onSelect,
  onJoinInstitution,
  onSectionCode,
  onRegisterInstitution,
  onBack,
}: Props) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = activeInstitutions(user.memberships);
  const chosenRoleIsActive = rows.some((row) => row.id === activeInstitutionId && row.role === activeRole);
  const isSelected = (row: InstitutionRow) =>
    row.id === activeInstitutionId && (chosenRoleIsActive ? row.role === activeRole : row.widest);
  const pending = [
    ...user.memberships
      .filter((m) => m.status === 'pending')
      .map((m) => ({ key: `m-${m.institutionId}-${m.role}`, label: `${m.institutionName} · ${ROLE_LABELS[m.role]}` })),
    ...(user.enrollments ?? [])
      .filter((e) => e.status === 'pending')
      .map((e) => ({ key: `e-${e.sectionId}`, label: `${e.subjectName} · ${e.sectionName}` })),
  ];
  // The role asked with an institution code is the one chosen at signup; anything else joins as student.
  const role: JoinRole = signupChoice === 'teacher' ? 'teacher' : 'student';

  const changeCode = (text: string) => {
    setCode(normalizeCode(text, INSTITUTION_CODE_LENGTH));
    setCodeError(null);
    setFormError(null);
    setInfo(null);
  };

  const submit = async () => {
    setFormError(null);
    setInfo(null);
    if (!isValidCodeAlphabet(code)) {
      setCodeError(CODE_ALPHABET_ERROR);
      return;
    }
    if (code.length === SECTION_CODE_LENGTH) {
      setCodeError(null);
      onSectionCode(code);
      return;
    }
    if (code.length !== INSTITUTION_CODE_LENGTH) {
      setCodeError(CODE_LENGTH_ERROR);
      return;
    }
    setCodeError(null);
    setBusy(true);
    try {
      const outcome = await onJoinInstitution(code, role);
      setInfo(INSTITUTION_OUTCOME_MESSAGES[outcome]);
      setCode('');
    } catch (err) {
      const message = joinErrorMessage(err);
      setCodeError(message.code ?? null);
      setFormError(message.form ?? null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Mis instituciones" onBack={onBack} fontSize={28} />
        <Text style={styles.lead}>
          Tu repaso del día reúne las tarjetas de todas. Elige la institución activa para ver sus secciones, mazos y
          evaluaciones.
        </Text>

        {rows.length > 0 ? (
          <View accessibilityRole="radiogroup" accessibilityLabel="Institución activa" style={styles.rows}>
            {rows.map((row) => (
              <OptionRow
                key={row.key}
                title={row.name}
                description={row.description}
                selected={isSelected(row)}
                onPress={() => (row.sendsRole ? onSelect(row.id, row.role) : onSelect(row.id))}
              />
            ))}
          </View>
        ) : null}

        <PendingList items={pending} />

        <View style={styles.joinBox}>
          <Text style={styles.label} nativeID="institution-code-label">
            Unirme a otra institución
          </Text>
          <View style={styles.joinRow}>
            <TextInput
              accessibilityLabel="Unirme a otra institución"
              accessibilityHint={codeError ?? undefined}
              aria-labelledby="institution-code-label"
              aria-invalid={!!codeError}
              value={code}
              onChangeText={changeCode}
              placeholder="K7M2P9QA"
              placeholderTextColor={colors.textSecondaryOnDark}
              selectionColor={colors.amber}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              onSubmitEditing={submit}
              style={[styles.input, codeError ? styles.inputError : null]}
            />
            <Button3D label="Unirme" size="secondary" onPress={submit} disabled={busy} />
          </View>
          <FieldError message={codeError ?? undefined} />
          <Text style={styles.help}>
            Pide el código de 8 caracteres a la institución. Si te unes con el código de una sección, quedas en su
            institución automáticamente.
          </Text>
        </View>

        {info ? <Notice message={info} /> : null}
        {formError ? <Notice tone="error" message={formError} /> : null}

        <View style={styles.footer}>
          <Button3D label="Registrar mi institución" tone="dark" onPress={onRegisterInstitution} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, paddingBottom: 28, gap: 18 },
  lead: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textSecondaryOnDark },
  rows: { gap: 10 },
  joinBox: { gap: 8, padding: 16, borderRadius: radius.field, backgroundColor: colors.surface },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondaryOnDark },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    backgroundColor: colors.appBackground,
    paddingHorizontal: 14,
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.textOnDark,
  },
  inputError: { borderColor: colors.amber },
  help: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondaryOnDark },
  footer: { marginTop: 'auto' },
});
