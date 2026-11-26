import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '../../../services/api/client';
import { AuthScreen } from '../AuthScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen(props: Partial<Parameters<typeof AuthScreen>[0]> = {}) {
  const handlers = {
    onSignIn: jest.fn(() => Promise.resolve()),
    onRegister: jest.fn(() => Promise.resolve()),
    onForgotPassword: jest.fn(),
    ...props,
  };
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AuthScreen {...handlers} />
    </SafeAreaProvider>,
  );
  return handlers;
}

const fill = async (email: string, password: string) => {
  await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), email);
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), password);
};

const emailTaken = () =>
  Promise.reject(
    new ApiError(409, 'EMAIL_TAKEN', 'Ya existe una cuenta verificada con este correo.', {
      email: 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
    }),
  );

describe('AuthScreen (pantalla 01, paso 1 de 3)', () => {
  it('shows the step-1 texts of the design', async () => {
    await renderScreen();
    expect(screen.getByText('Crear cuenta · paso 1 de 3')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Crear cuenta' })).toBeSelected();
    expect(screen.getByText('Correo electrónico')).toBeTruthy();
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeTruthy();
    expect(screen.getByText('¿Cómo usarás Memora?')).toBeTruthy();
    expect(screen.getByText('Luego te unes a tu sección con su código')).toBeTruthy();
    expect(screen.getByText('Luego te unes a tu institución y ella confirma tu rol')).toBeTruthy();
    expect(screen.getByRole('link', { name: '¿Coordinas una universidad o un curso? Regístralo' })).toBeTruthy();
    expect(screen.getByText('CONTINUAR')).toBeTruthy();
  });

  it('CONTINUAR creates the account with email, password and the choice', async () => {
    const { onRegister, onSignIn } = await renderScreen();
    await fireEvent.press(screen.getByRole('radio', { name: /Soy profesor/ }));
    await fill('  luis.perez@gmail.com ', 'clave-segura');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(onRegister).toHaveBeenCalledWith('luis.perez@gmail.com', 'clave-segura', 'teacher');
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it('does not continue with an invalid email or a short password and says why', async () => {
    const { onRegister } = await renderScreen();
    await fill('luis', 'corta');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(onRegister).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe un correo válido.')).toBeTruthy();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeTruthy();
  });

  it('EMAIL_TAKEN shows the message under the email and offers to sign in with it', async () => {
    const { onSignIn } = await renderScreen({ onRegister: jest.fn(emailTaken) });
    await fill('ana@unerg.edu.ve', 'clave-segura');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Iniciar sesión con este correo' }));

    expect(screen.getByRole('tab', { name: 'Iniciar sesión' })).toBeSelected();
    expect(screen.getByLabelText('Correo electrónico').props.value).toBe('ana@unerg.edu.ve');
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it('prefills the email after "Cambiar correo"', async () => {
    await renderScreen({ initialEmail: 'ana@unerg.edu.ve' });
    expect(screen.getByLabelText('Correo electrónico').props.value).toBe('ana@unerg.edu.ve');
    expect(screen.getByRole('tab', { name: 'Crear cuenta' })).toBeSelected();
  });

  it('the institution link chooses "institution": CONTINUAR then creates the account with that choice', async () => {
    const { onRegister, onSignIn } = await renderScreen();
    await fireEvent.press(screen.getByRole('link', { name: '¿Coordinas una universidad o un curso? Regístralo' }));
    expect(screen.queryByText(/disponible pronto/)).toBeNull();
    expect(screen.getByText('Después de crear tu cuenta registrarás tu institución.')).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Soy estudiante/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Soy profesor/ })).not.toBeChecked();
    expect(onRegister).not.toHaveBeenCalled();

    await fill('pedro.gomez@gmail.com', 'clave-segura');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(onRegister).toHaveBeenCalledWith('pedro.gomez@gmail.com', 'clave-segura', 'institution');
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it('choosing a role after the institution link goes back to that role', async () => {
    const { onRegister } = await renderScreen();
    await fireEvent.press(screen.getByRole('link', { name: '¿Coordinas una universidad o un curso? Regístralo' }));
    await fireEvent.press(screen.getByRole('radio', { name: /Soy estudiante/ }));
    expect(screen.queryByText('Después de crear tu cuenta registrarás tu institución.')).toBeNull();
    await fill('luis.perez@gmail.com', 'clave-segura');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(onRegister).toHaveBeenCalledWith('luis.perez@gmail.com', 'clave-segura', 'student');
  });

  it('"Iniciar sesión" signs in and hides the role choice', async () => {
    const { onSignIn, onRegister } = await renderScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Iniciar sesión' }));
    expect(screen.queryByText('¿Cómo usarás Memora?')).toBeNull();
    expect(screen.getByText('Repasa en el momento justo')).toBeTruthy();
    await fill('ana@unerg.edu.ve', 'clave-segura');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(onSignIn).toHaveBeenCalledWith('ana@unerg.edu.ve', 'clave-segura');
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('shows the server message when signing in fails', async () => {
    await renderScreen({
      onSignIn: jest.fn(() =>
        Promise.reject(new ApiError(401, 'INVALID_CREDENTIALS', 'El correo o la contraseña no son correctos.')),
      ),
    });
    await fireEvent.press(screen.getByRole('tab', { name: 'Iniciar sesión' }));
    await fill('ana@unerg.edu.ve', 'clave-mala-1');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('El correo o la contraseña no son correctos.')).toBeTruthy();
  });
});
