// Pantalla 05 · Unirse a una sección (RF-04, RF-60, RF-63, RF-65, RF-67, CU-35).
// The preview loads when the 6th character is typed and "Unirme" confirms. QR and invitation links
// are not available yet. Pending requests are listed with "Por confirmar".
// Visual reference: design/pantallas_png/05_Unirse_a_una_seccion.png
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../components/Button3D';
import { Card3D } from '../../components/Card3D';
import { FieldError } from '../../components/form/FieldError';
import { Notice } from '../../components/Notice';
import { TextLink } from '../../components/TextLink';
import type { User } from '../../services/api/client';
import type { JoinOutcome, SectionPreview } from '../../services/api/onboarding';
import { colors, fonts, radius, spacing, typography } from '../../theme';
import {
  CODE_ALPHABET_ERROR,
  isValidCodeAlphabet,
  joinErrorMessage,
  normalizeCode,
  SECTION_CODE_LENGTH,
  SECTION_OUTCOME_MESSAGES,
} from '../onboarding/joinCode';
import { PendingList } from '../onboarding/PendingList';
import { ScreenHeader } from '../onboarding/ScreenHeader';

const QR_PENDING = 'Escanear el código QR estará disponible pronto en Memora.';
const CODE_INCOMPLETE = 'Escribe los 6 caracteres del código.';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Props = {
  user: User;
  /** Code that another screen already has (6 characters typed on screen 22). */
  initialCode?: string;
  onPreview: (code: string) => Promise<SectionPreview>;
  onJoin: (code: string) => Promise<JoinOutcome>;
  onOpenInstitutions: () => void;
  /** Only when the screen was opened from another one. */
  onBack?: () => void;
  onJoined?: (outcome: JoinOutcome) => void;
};

export function JoinSectionScreen({ user, initialCode, onPreview, onJoin, onOpenInstitutions, onBack, onJoined }: Props) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<SectionPreview | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Only the answer for the code on screen counts when the person keeps typing.
  const latest = useRef('');

  const loadPreview = async (value: string) => {
    latest.current = value;
    try {
      const found = await onPreview(value);
      if (latest.current === value) setPreview(found);
    } catch (err) {
      if (latest.current !== value) return;
      const message = joinErrorMessage(err);
      setCodeError(message.code ?? null);
      setFormError(message.form ?? null);
    }
  };

  const changeCode = (text: string) => {
    const next = normalizeCode(text, SECTION_CODE_LENGTH);
    latest.current = next;
    setCode(next);
    setPreview(null);
    setCodeError(null);
    setFormError(null);
    setInfo(null);
    if (!isValidCodeAlphabet(next)) {
      setCodeError(CODE_ALPHABET_ERROR);
      return;
    }
    if (next.length === SECTION_CODE_LENGTH) loadPreview(next);
  };

  useEffect(() => {
    if (initialCode) changeCode(initialCode);
    // Only the code the screen was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const join = async () => {
    setFormError(null);
    setInfo(null);
    if (!isValidCodeAlphabet(code)) {
      setCodeError(CODE_ALPHABET_ERROR);
      return;
    }
    if (code.length < SECTION_CODE_LENGTH) {
      setCodeError(CODE_INCOMPLETE);
      return;
    }
    setCodeError(null);
    setBusy(true);
    try {
      const outcome = await onJoin(code);
      setInfo(SECTION_OUTCOME_MESSAGES[outcome]);
      onJoined?.(outcome);
    } catch (err) {
      const message = joinErrorMessage(err);
      setCodeError(message.code ?? null);
      setFormError(message.form ?? null);
    } finally {
      setBusy(false);
    }
  };

  const pending = (user.enrollments ?? [])
    .filter((e) => e.status === 'pending')
    .map((e) => ({ key: String(e.sectionId), label: `${e.subjectName} · ${e.sectionName}` }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Unirme a una sección" onBack={onBack} />
        <Text style={styles.lead}>
          Escribe el código de 6 caracteres, abre el enlace que te enviaron o escanea el QR que proyecta tu profesor.
        </Text>

        <Button3D label="Escanear código QR" size="secondary" tone="dark" onPress={() => setInfo(QR_PENDING)} />

        <View style={styles.codeGroup}>
          <Text style={typography.label} nativeID="section-code-label">
            Código de la sección
          </Text>
          <View>
            <View style={styles.boxes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: SECTION_CODE_LENGTH }, (_, i) => (
                <View key={i} style={[styles.box, code[i] ? styles.boxFilled : null]}>
                  <Text style={styles.char}>{code[i] ?? ''}</Text>
                </View>
              ))}
            </View>
            {/* One real input over the six boxes, like screen 02: paste and the keyboard work as usual. */}
            <TextInput
              accessibilityLabel="Código de la sección"
              accessibilityHint={codeError ?? 'Seis caracteres: números del 2 al 9 y letras sin I ni O'}
              aria-labelledby="section-code-label"
              aria-invalid={!!codeError}
              value={code}
              onChangeText={changeCode}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={SECTION_CODE_LENGTH + 2}
              caretHidden
              selectionColor="transparent"
              style={styles.hiddenInput}
              onSubmitEditing={join}
            />
          </View>
          <FieldError message={codeError ?? undefined} />
        </View>

        {preview ? <PreviewCard preview={preview} user={user} /> : null}

        <PendingList items={pending} />

        <TextLink label="Mis instituciones" tone="primary" onPress={onOpenInstitutions} style={styles.center} />

        <View style={styles.footer}>
          {info ? <Notice message={info} /> : null}
          {formError ? <Notice tone="error" message={formError} /> : null}
          <Button3D label="Unirme" onPress={join} disabled={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function statusLine(preview: SectionPreview, user: User): string {
  if (preview.outcome === 'pending') return 'Tu solicitud queda por confirmar';
  if (preview.outcome === 'already') return 'Ya estás en esta sección';
  const onRoster = (user.enrollments ?? []).some(
    (e) => e.status === 'invited' && e.subjectName === preview.subjectName && e.sectionName === preview.sectionName,
  );
  return onRoster ? 'Estás en la lista de inscritos: entras de inmediato' : 'Entras de inmediato';
}

function PreviewCard({ preview, user }: { preview: SectionPreview; user: User }) {
  const place = preview.areaName ? `${preview.institutionName} · ${preview.areaName}` : preview.institutionName;
  const section = preview.termName ? `${preview.sectionName} · Lapso ${preview.termName}` : preview.sectionName;
  const counts = `${plural(preview.deckCount, 'mazo asignado', 'mazos asignados')} · ${plural(
    preview.assessmentCount,
    'evaluación programada',
    'evaluaciones programadas',
  )}`;
  return (
    <Card3D>
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text style={styles.place}>{place}</Text>
        <Text style={styles.subject}>{preview.subjectName}</Text>
        <View style={styles.details}>
          <Text style={styles.detail}>{section}</Text>
          {preview.teacherName ? <Text style={styles.detail}>Docente: {preview.teacherName}</Text> : null}
          <Text style={styles.detail}>{counts}</Text>
          <Text style={[styles.detail, styles.status, preview.outcome === 'pending' && styles.statusPending]}>
            {statusLine(preview, user)}
          </Text>
        </View>
      </View>
    </Card3D>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, paddingBottom: 28, gap: 20 },
  lead: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textSecondaryOnDark },
  codeGroup: { gap: 10 },
  boxes: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.amber },
  char: { fontFamily: fonts.displaySemi, fontSize: 26, color: colors.textOnDark },
  hiddenInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.02, color: 'transparent', fontSize: 1 },
  card: { gap: 14 },
  place: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.tealText },
  subject: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.textOnLight },
  details: { gap: 6 },
  detail: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.textSecondaryOnLight },
  status: { fontFamily: fonts.bodySemi, color: colors.tealText },
  statusPending: { color: colors.textOnLight },
  center: { alignSelf: 'center' },
  footer: { marginTop: 'auto', gap: 12 },
});
