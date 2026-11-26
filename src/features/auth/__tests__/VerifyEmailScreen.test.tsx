import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '../../../services/api/client';
import { VerifyEmailScreen } from '../VerifyEmailScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen(props: Partial<Parameters<typeof VerifyEmailScreen>[0]> = {}) {
  const handlers = {
    onVerify: jest.fn((_code: string) => Promise.resolve()),
    onResend: jest.fn(() => Promise.resolve()),
    onChangeEmail: jest.fn(),
    ...props,
  };
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <VerifyEmailScreen email="luis.perez@gmail.com" {...handlers} />
    </SafeAreaProvider>,
  );
  return handlers;
}

const typeCode = (code: string) => fireEvent.changeText(screen.getByLabelText('Código de verificación'), code);
const tick = (seconds: number) => act(() => jest.advanceTimersByTime(seconds * 1000));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('VerifyEmailScreen (pantalla 02, paso 2 de 3)', () => {
  it('shows the texts of the design', async () => {
    await renderScreen();
    expect(screen.getByRole('header', { name: 'Verifica tu correo' })).toBeTruthy();
    expect(screen.getByText('Crear cuenta · paso 2 de 3')).toBeTruthy();
    expect(
      screen.getByText('Enviamos un código de 6 dígitos a luis.perez@gmail.com. Vence en 15 minutos.'),
    ).toBeTruthy();
    expect(screen.getByText('Código de verificación')).toBeTruthy();
    expect(screen.getAllByTestId('code-box', { includeHiddenElements: true })).toHaveLength(6);
    expect(screen.getByText('Reenviar código en 1:00')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cambiar correo' })).toBeTruthy();
    expect(
      screen.getByText('Lo pedimos para que nadie más pueda usar tu correo, tus datos ni tu lugar en una sección.'),
    ).toBeTruthy();
    expect(screen.getByText('VERIFICAR')).toBeTruthy();
  });

  it('the code input is a one-time-code number pad limited to 6 digits', async () => {
    await renderScreen();
    const input = screen.getByLabelText('Código de verificación');
    expect(input.props).toMatchObject({
      keyboardType: 'number-pad',
      textContentType: 'oneTimeCode',
      autoComplete: 'one-time-code',
      maxLength: 6,
    });
  });

  it('typing 6 digits verifies the code; other characters are ignored', async () => {
    const { onVerify } = await renderScreen();
    await typeCode('48 2');
    expect(onVerify).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Código de verificación').props.value).toBe('482');
    await typeCode('482015');
    expect(onVerify).toHaveBeenCalledWith('482015');
  });

  it('VERIFICAR asks for the 6 digits when the code is incomplete', async () => {
    const { onVerify } = await renderScreen();
    await typeCode('482');
    await fireEvent.press(screen.getByRole('button', { name: 'Verificar' }));
    expect(onVerify).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe los 6 dígitos del código.')).toBeTruthy();
  });

  it('CODE_INVALID shows the message with the attempts left and clears the code', async () => {
    await renderScreen({
      onVerify: jest.fn(() =>
        Promise.reject(new ApiError(400, 'CODE_INVALID', 'El código no es correcto.', {}, 3)),
      ),
    });
    await typeCode('000000');
    expect(await screen.findByText('El código no es correcto. Te quedan 3 intentos.')).toBeTruthy();
    expect(screen.getByLabelText('Código de verificación').props.value).toBe('');
  });

  it('CODE_EXPIRED shows the server message once and offers a new code right away', async () => {
    // Exact message sent by memora-api (auth.service.ts codeExpired).
    const serverMessage = 'El código venció o se anuló. Pide uno nuevo.';
    const { onResend } = await renderScreen({
      onVerify: jest.fn(() => Promise.reject(new ApiError(410, 'CODE_EXPIRED', serverMessage))),
    });
    await typeCode('123456');
    expect(await screen.findByText(serverMessage)).toBeTruthy();
    expect(screen.queryByText(/Pide un código nuevo/)).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: 'Reenviar código' }));
    expect(onResend).toHaveBeenCalled();
  });

  it('CODE_EXPIRED without a server message asks for a new code', async () => {
    await renderScreen({
      onVerify: jest.fn(() => Promise.reject(new ApiError(410, 'CODE_EXPIRED', ''))),
    });
    await typeCode('123456');
    expect(await screen.findByText('Pide un código nuevo.')).toBeTruthy();
  });

  it('counts down from 60 and then offers "Reenviar código", which restarts the countdown', async () => {
    const { onResend } = await renderScreen();
    await tick(18);
    expect(screen.getByText('Reenviar código en 0:42')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Reenviar código' })).toBeNull();

    await tick(42);
    await fireEvent.press(screen.getByRole('link', { name: 'Reenviar código' }));

    expect(onResend).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Te enviamos un código nuevo a luis.perez@gmail.com.')).toBeTruthy();
    expect(screen.getByText('Reenviar código en 1:00')).toBeTruthy();
  });

  it('RESEND_TOO_SOON waits the seconds the server asks for', async () => {
    await renderScreen({
      onResend: jest.fn(() =>
        Promise.reject(new ApiError(429, 'RESEND_TOO_SOON', 'Espera antes de pedir otro código.', {}, null, 25)),
      ),
    });
    await tick(60);
    await fireEvent.press(screen.getByRole('link', { name: 'Reenviar código' }));
    expect(screen.getByText('Reenviar código en 0:25')).toBeTruthy();
    expect(screen.getByText('Espera antes de pedir otro código.')).toBeTruthy();
  });

  it('"Cambiar correo" and the back button go back to step 1', async () => {
    const { onChangeEmail } = await renderScreen();
    await fireEvent.press(screen.getByRole('link', { name: 'Cambiar correo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Volver al paso 1' }));
    expect(onChangeEmail).toHaveBeenCalledTimes(2);
  });
});
