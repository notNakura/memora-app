import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError, type User } from '../../../services/api/client';
import { PersonalDataScreen } from '../PersonalDataScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const newUser: User = {
  id: 1,
  email: 'luis.perez@gmail.com',
  emailVerified: true,
  profileComplete: false,
  nationalId: null,
  firstNames: null,
  lastNames: null,
  birthDate: null,
  sex: null,
  onboardingCompleted: false,
  memberships: [],
};

const preloadedUser: User = {
  ...newUser,
  nationalId: 'V-20000001',
  firstNames: 'Luis Alberto',
  lastNames: 'Pérez Gil',
  birthDate: '2004-05-21',
  sex: 'male',
  memberships: [{ institutionId: 1, institutionName: 'UNERG', role: 'student', status: 'invited', areaId: null }],
};

async function renderScreen(user: User = newUser, onCreateAccount: jest.Mock = jest.fn(() => Promise.resolve())) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PersonalDataScreen user={user} onCreateAccount={onCreateAccount} />
    </SafeAreaProvider>,
  );
  return { onCreateAccount };
}

const fillRequired = async () => {
  await fireEvent.changeText(screen.getByLabelText('Cédula de identidad'), 'V-20.000.001');
  await fireEvent.changeText(screen.getByLabelText('Nombres'), ' Luis Alberto ');
  await fireEvent.changeText(screen.getByLabelText('Apellidos'), 'Pérez Gil');
};

describe('PersonalDataScreen (pantalla 03, paso 3 de 3)', () => {
  it('shows the texts of the design', async () => {
    await renderScreen();
    expect(screen.getByText('Completa tus datos')).toBeTruthy();
    expect(screen.getByText('Crear cuenta · paso 3 de 3')).toBeTruthy();
    expect(screen.getByText('Fecha de nacimiento')).toBeTruthy();
    expect(screen.getByText('Sexo')).toBeTruthy();
    expect(screen.getByText(/tu profesor no los ve\./)).toBeTruthy();
    expect(screen.getByText('CREAR CUENTA')).toBeTruthy();
    // The email is already verified: there is no way back to step 2.
    expect(screen.queryByRole('button', { name: 'Volver al paso 2' })).toBeNull();
    expect(screen.queryByText(/lista de inscritos/)).toBeNull();
  });

  it('prefills the data loaded by the institution and says where it comes from', async () => {
    const { onCreateAccount } = await renderScreen(preloadedUser);
    expect(
      screen.getByText('Tu correo está en la lista de inscritos de la UNERG: tus datos ya están cargados. Revísalos.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Cédula de identidad').props.value).toBe('V-20000001');
    expect(screen.getByLabelText('Nombres').props.value).toBe('Luis Alberto');
    expect(screen.getByLabelText('Apellidos').props.value).toBe('Pérez Gil');

    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(onCreateAccount).toHaveBeenCalledWith({
      nationalId: 'V-20000001',
      firstNames: 'Luis Alberto',
      lastNames: 'Pérez Gil',
      birthDate: '2004-05-21',
      sex: 'male',
    });
  });

  it('CREAR CUENTA completes the profile with the required data and optional fields empty', async () => {
    const { onCreateAccount } = await renderScreen();
    await fillRequired();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(onCreateAccount).toHaveBeenCalledWith({
      nationalId: 'V-20.000.001',
      firstNames: 'Luis Alberto',
      lastNames: 'Pérez Gil',
      birthDate: null,
      sex: null,
    });
  });

  it('requires cédula, nombres and apellidos', async () => {
    const { onCreateAccount } = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(onCreateAccount).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe tu cédula.')).toBeTruthy();
    expect(screen.getByText('Escribe tus nombres.')).toBeTruthy();
    expect(screen.getByText('Escribe tus apellidos.')).toBeTruthy();
  });

  it('sends sex with its stored value', async () => {
    const { onCreateAccount } = await renderScreen();
    await fillRequired();
    await fireEvent.press(screen.getByRole('button', { name: /Sexo/ }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Femenino' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(onCreateAccount.mock.calls[0][0]).toMatchObject({ sex: 'female' });
  });

  it('NATIONAL_ID_TAKEN shows the short reason under the field and the advice for the form (8a)', async () => {
    const advice =
      'Esta cédula está en la lista de inscritos de una institución con otro correo. Pide a tu institución que corrija tu correo en la lista.';
    await renderScreen(
      newUser,
      jest.fn(() =>
        Promise.reject(
          new ApiError(409, 'NATIONAL_ID_TAKEN', advice, {
            nationalId: 'Esta cédula está en una lista de inscritos con otro correo.',
          }),
        ),
      ),
    );
    await fillRequired();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Esta cédula está en una lista de inscritos con otro correo.')).toBeTruthy();
    expect(screen.getByText(advice)).toBeTruthy();
    expect(screen.getByLabelText('Cédula de identidad').props['aria-invalid']).toBe(true);
  });

  it('NATIONAL_ID_TAKEN is shown under the cédula field', async () => {
    await renderScreen(
      newUser,
      jest.fn(() =>
        Promise.reject(
          new ApiError(409, 'NATIONAL_ID_TAKEN', 'Esta cédula ya pertenece a otra cuenta. Recupera tu contraseña.'),
        ),
      ),
    );
    await fillRequired();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Esta cédula ya pertenece a otra cuenta. Recupera tu contraseña.')).toBeTruthy();
    expect(screen.getByLabelText('Cédula de identidad').props['aria-invalid']).toBe(true);
  });

  it('shows other server errors in a notice', async () => {
    await renderScreen(
      newUser,
      jest.fn(() => Promise.reject(new ApiError(0, 'NETWORK', 'No pudimos conectar con Memora.'))),
    );
    await fillRequired();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('No pudimos conectar con Memora.')).toBeTruthy();
  });
});
