// Pantalla 01 · Ingreso y registro con rol, paso 1 de 3 (CU-01, RF-01, RF-36).
// Visual reference: design/pantallas_png/01_Ingreso_y_registro_con_rol.png
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../components/Button3D';
import { TextField } from '../../components/form/TextField';
import { Memo } from '../../components/Memo';
import { Notice } from '../../components/Notice';
import { OptionRow } from '../../components/OptionRow';
import { TabSwitch } from '../../components/TabSwitch';
import { TextLink } from '../../components/TextLink';
import { ApiError } from '../../services/api/client';
import type { SignupChoice } from '../../services/signupChoiceStore';
import { colors, spacing, typography } from '../../theme';
import { validateAccess, type FieldErrors } from './validation';

export type AuthMode = 'login' | 'register';

const UNEXPECTED = 'Ocurrió un error inesperado. Intenta de nuevo.';
// The link keeps the choice "institution": after the guide the person goes to Registrar mi institución (33).
const INSTITUTION_NEXT = 'Después de crear tu cuenta registrarás tu institución.';

type Props = {
  initialMode?: AuthMode;
  /** Prefilled after "Cambiar correo" on screen 02. */
  initialEmail?: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, choice: SignupChoice) => Promise<void>;
  onForgotPassword: () => void;
};

export function AuthScreen({ initialMode = 'register', initialEmail, onSignIn, onRegister, onForgotPassword }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [choice, setChoice] = useState<SignupChoice>('student');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  const changeMode = (next: AuthMode) => {
    setMode(next);
    setErrors({});
    setFormError(null);
    setEmailTaken(false);
  };

  const submit = async () => {
    const found = validateAccess(email, password);
    setErrors(found);
    setFormError(null);
    setEmailTaken(false);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      if (isRegister) await onRegister(email.trim(), password, choice);
      else await onSignIn(email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        // CU-01 6a: the email belongs to a verified account → offer to sign in (or recover the password).
        setErrors({ email: err.fields.email ?? err.message });
        setEmailTaken(true);
      } else if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError(UNEXPECTED);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitLabel = isRegister ? (busy ? 'Enviando código…' : 'Continuar') : busy ? 'Entrando…' : 'Iniciar sesión';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text accessibilityRole="header" style={typography.brand}>
              memora
            </Text>
            <Text style={typography.secondary}>
              {isRegister ? 'Crear cuenta · paso 1 de 3' : 'Repasa en el momento justo'}
            </Text>
          </View>
          <Memo pose="hello" size={76} />
        </View>

        <TabSwitch<AuthMode>
          accessibilityLabel="Acceso"
          tabs={[
            { key: 'login', label: 'Iniciar sesión' },
            { key: 'register', label: 'Crear cuenta' },
          ]}
          value={mode}
          onChange={changeMode}
        />

        <View style={styles.fields}>
          <View>
            <TextField
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              placeholder="luis.perez@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            {emailTaken ? (
              <TextLink
                label="Iniciar sesión con este correo"
                tone="primary"
                onPress={() => changeMode('login')}
                style={styles.alignStart}
              />
            ) : null}
          </View>
          <View>
            <TextField
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              textContentType={isRegister ? 'newPassword' : 'password'}
              onSubmitEditing={submit}
            />
            <TextLink label="¿Olvidaste tu contraseña?" onPress={onForgotPassword} style={styles.alignEnd} />
          </View>
        </View>

        {isRegister && (
          <View accessibilityRole="radiogroup" accessibilityLabel="¿Cómo usarás Memora?" style={styles.roles}>
            <Text accessibilityRole="header" style={[typography.heading, styles.rolesTitle]}>
              ¿Cómo usarás Memora?
            </Text>
            <OptionRow
              title="Soy estudiante"
              description="Luego te unes a tu sección con su código"
              selected={choice === 'student'}
              onPress={() => setChoice('student')}
            />
            <OptionRow
              title="Soy profesor"
              description="Luego te unes a tu institución y ella confirma tu rol"
              selected={choice === 'teacher'}
              onPress={() => setChoice('teacher')}
            />
          </View>
        )}

        <View style={styles.footer}>
          {isRegister ? (
            <TextLink
              label="¿Coordinas una universidad o un curso? Regístralo"
              accessibilityHint="Crea tu cuenta para registrar tu universidad, instituto o curso"
              onPress={() => setChoice('institution')}
              style={styles.alignCenter}
            />
          ) : null}
          {isRegister && choice === 'institution' ? <Notice message={INSTITUTION_NEXT} /> : null}
          {formError ? <Notice tone="error" message={formError} /> : null}
          <Button3D
            label={submitLabel}
            accessibilityHint={isRegister ? 'Crea tu cuenta y te envía un código a tu correo (paso 2 de 3)' : undefined}
            onPress={submit}
            disabled={busy}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: {
    flexGrow: 1,
    paddingTop: spacing.block,
    paddingHorizontal: spacing.screenX,
    paddingBottom: 28,
    gap: 18,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { gap: 4, flexShrink: 1 },
  fields: { gap: 6 },
  alignStart: { alignSelf: 'flex-start' },
  alignEnd: { alignSelf: 'flex-end' },
  alignCenter: { alignSelf: 'center' },
  roles: { gap: 10 },
  rolesTitle: { marginBottom: 8 },
  footer: { marginTop: 'auto', gap: 12 },
});
