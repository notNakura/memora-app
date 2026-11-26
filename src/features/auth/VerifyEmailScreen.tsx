// Pantalla 02 · Verifica tu correo, paso 2 de 3 (CU-01, RF-01, RF-68).
// Visual reference: design/pantallas_png/02_Verifica_tu_correo.png
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Button3D } from '../../components/Button3D';
import { FieldError } from '../../components/form/FieldError';
import { IconButton3D } from '../../components/IconButton3D';
import { ChevronLeftIcon, ShieldCheckIcon } from '../../components/icons';
import { Notice } from '../../components/Notice';
import { TextLink } from '../../components/TextLink';
import { ApiError } from '../../services/api/client';
import { colors, fonts, radius, spacing, typography } from '../../theme';

const CODE_LENGTH = 6;
/** Seconds before a new code can be requested (the server enforces it with RESEND_TOO_SOON). */
export const RESEND_COOLDOWN_SECONDS = 60;
const UNEXPECTED = 'Ocurrió un error inesperado. Intenta de nuevo.';

const formatSeconds = (total: number) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
const attemptsText = (n: number) => (n === 1 ? 'Te queda 1 intento.' : `Te quedan ${n} intentos.`);

type Props = {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  /** Signs out and returns to step 1 with the email filled in. */
  onChangeEmail: () => void;
};

export function VerifyEmailScreen({ email, onVerify, onResend, onChangeEmail }: Props) {
  const [code, setCode] = useState('');
  // Countdown from a deadline, so a late timer never makes it drift.
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const waitBeforeResend = (seconds: number) => {
    const current = Date.now();
    setNow(current);
    setResendAt(current + seconds * 1000);
  };
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const counting = secondsLeft > 0;
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  const verify = async (value: string) => {
    setFormError(null);
    setInfo(null);
    if (value.length < CODE_LENGTH) {
      setCodeError('Escribe los 6 dígitos del código.');
      return;
    }
    setCodeError(null);
    setBusy(true);
    try {
      await onVerify(value);
    } catch (err) {
      setCode('');
      if (err instanceof ApiError && err.code === 'CODE_INVALID') {
        setCodeError(err.attemptsLeft != null ? `${err.message} ${attemptsText(err.attemptsLeft)}` : err.message);
      } else if (err instanceof ApiError && err.code === 'CODE_EXPIRED') {
        // The server message already asks for a new code; fall back only when it sent none.
        setCodeError(err.message || 'Pide un código nuevo.');
        waitBeforeResend(0);
      } else {
        setFormError(err instanceof ApiError ? err.message : UNEXPECTED);
      }
    } finally {
      setBusy(false);
    }
  };

  const changeCode = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH && !busy) verify(digits);
  };

  const resend = async () => {
    setFormError(null);
    setInfo(null);
    try {
      await onResend();
      setCodeError(null);
      setCode('');
      waitBeforeResend(RESEND_COOLDOWN_SECONDS);
      setInfo(`Te enviamos un código nuevo a ${email}.`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESEND_TOO_SOON') {
        waitBeforeResend(err.retryAfter ?? RESEND_COOLDOWN_SECONDS);
      }
      setFormError(err instanceof ApiError ? err.message : UNEXPECTED);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <IconButton3D accessibilityLabel="Volver al paso 1" onPress={onChangeEmail}>
            <ChevronLeftIcon color={colors.textOnDark} />
          </IconButton3D>
          <View style={styles.titles}>
            <Text accessibilityRole="header" style={styles.title}>
              Verifica tu correo
            </Text>
            <Text style={typography.secondary}>Crear cuenta · paso 2 de 3</Text>
          </View>
        </View>

        <Text style={styles.lead}>
          Enviamos un código de 6 dígitos a <Text style={styles.leadEmail}>{email}</Text>. Vence en 15 minutos.
        </Text>

        <View style={styles.codeGroup}>
          <Text style={typography.label} nativeID="code-label">
            Código de verificación
          </Text>
          <View>
            <View style={styles.boxes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <View key={i} testID="code-box" style={styles.box}>
                  <Text style={styles.digit}>{code[i] ?? ''}</Text>
                </View>
              ))}
            </View>
            {/* One real input over the six boxes: autofill of the SMS/email code and paste work as usual. */}
            <TextInput
              accessibilityLabel="Código de verificación"
              accessibilityHint={codeError ?? 'Seis dígitos'}
              aria-labelledby="code-label"
              aria-invalid={!!codeError}
              value={code}
              onChangeText={changeCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              caretHidden
              selectionColor="transparent"
              style={styles.hiddenInput}
              onSubmitEditing={() => verify(code)}
            />
          </View>
          <FieldError message={codeError ?? undefined} />
        </View>

        <View style={styles.links}>
          {secondsLeft > 0 ? (
            <Text style={styles.countdown} accessibilityLiveRegion="none">
              Reenviar código en {formatSeconds(secondsLeft)}
            </Text>
          ) : (
            <TextLink label="Reenviar código" tone="primary" onPress={resend} />
          )}
          <TextLink label="Cambiar correo" tone="primary" onPress={onChangeEmail} />
        </View>

        <Notice
          message="Lo pedimos para que nadie más pueda usar tu correo, tus datos ni tu lugar en una sección."
          icon={<ShieldCheckIcon color={colors.textOnLight} />}
        />

        <View style={styles.footer}>
          <View style={styles.illustration}>
            <EnvelopeIllustration />
          </View>
          {info ? <Notice message={info} /> : null}
          {formError ? <Notice tone="error" message={formError} /> : null}
          <Button3D label={busy ? 'Verificando…' : 'Verificar'} onPress={() => verify(code)} disabled={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Envelope with a check, copied from design/pantallas_html/02_Verifica_tu_correo.html. Decorative. */
function EnvelopeIllustration() {
  return (
    // aria-hidden works on native and web; the iOS/Android-only props leak to the DOM through react-native-svg.
    <Svg width={120} height={104} viewBox="0 0 120 104" aria-hidden>
      <Rect x="10" y="22" width="100" height="70" rx="14" fill={colors.surface} stroke={colors.inputBorder} strokeWidth={3} />
      <Path d="M14 30l46 32 46-32" fill="none" stroke={colors.amber} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="98" cy="22" r="16" fill={colors.amber} />
      <Path d="M91 22l5 5 9-10" fill="none" stroke={colors.appBackground} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, paddingBottom: 28, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titles: { flexShrink: 1 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.textOnDark },
  lead: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textSecondaryOnDark },
  leadEmail: { fontFamily: fonts.bodySemi, color: colors.textOnDark },
  codeGroup: { gap: 10 },
  boxes: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    minWidth: 0,
    height: 60,
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontFamily: fonts.displaySemi, fontSize: 26, color: colors.textOnDark },
  hiddenInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.02, color: 'transparent', fontSize: 1 },
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  countdown: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondaryOnDark },
  footer: { marginTop: 'auto', gap: 16 },
  illustration: { alignItems: 'center' },
});
