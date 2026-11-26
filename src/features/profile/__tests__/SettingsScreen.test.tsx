import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError, type User } from '../../../services/api/client';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

// The native pickers are replaced by a button that "chooses" a fixed value.
jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ mode, onChange }: { mode: string; onChange: (e: { type: string }, d: Date) => void }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`picker-${mode}`}
        onPress={() =>
          onChange({ type: 'set' }, mode === 'time' ? new Date(2026, 0, 1, 7, 30) : new Date(2004, 4, 9))
        }
      >
        <Text>picker</Text>
      </Pressable>
    ),
  };
});

jest.mock('../../../components/feedback', () => ({
  tapFeedback: jest.fn(),
  setVibrationEnabled: jest.fn(),
}));
const { setVibrationEnabled } = jest.requireMock('../../../components/feedback') as {
  setVibrationEnabled: jest.Mock;
};

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => render(<SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>);

const user: User = {
  id: 1,
  email: 'luis.perez@gmail.com',
  emailVerified: true,
  profileComplete: true,
  nationalId: 'V-20000001',
  firstNames: 'Luis',
  lastNames: 'Pérez',
  birthDate: null,
  sex: null,
  onboardingCompleted: true,
  memberships: [{ institutionId: 1, institutionName: 'UNERG', role: 'student', status: 'active', areaId: null }],
  enrollments: [
    {
      sectionId: 9,
      institutionId: 1,
      subjectName: 'SI3',
      sectionName: 'Sección 1',
      teacherName: 'María Hernández',
      status: 'active',
    },
  ],
  desiredRetention: 0.9,
  timeFactor: 1,
  dailyNewLimit: 20,
  notificationsEnabled: true,
  vibrationEnabled: true,
  reminderTime: '19:00',
  showNamePublicly: true,
};

async function setup(overrides: Partial<React.ComponentProps<typeof SettingsScreen>> = {}) {
  const props = {
    user,
    streak: null,
    onBack: jest.fn(),
    onSavePreferences: jest.fn(async () => undefined),
    onSavePersonalData: jest.fn(async () => undefined),
    onLeaveSection: jest.fn(async () => undefined),
    onOpenHelp: jest.fn(),
    onSignOut: jest.fn(),
    ...overrides,
  };
  await wrap(<SettingsScreen {...props} />);
  return props;
}

beforeEach(() => jest.clearAllMocks());

describe('SettingsScreen (23)', () => {
  it('shows every row of the mockup', async () => {
    await setup();
    expect(screen.getByRole('header', { name: 'Ajustes y cuenta' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Recordatorio diario' })).toBeTruthy();
    expect(screen.getByText('7:00 p. m.')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Vibración' })).toBeTruthy();
    expect(screen.getByText('Al responder y al tocar los botones principales')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Mostrar mi nombre en mazos públicos' })).toBeTruthy();
    expect(screen.getByText('Si lo apagas, aparece «Estudiante de la UNERG»')).toBeTruthy();
    expect(screen.getByText('Tarjetas nuevas por día')).toBeTruthy();
    expect(screen.getByText('Menos tarjetas, repasos más cortos')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('Racha')).toBeTruthy();
    expect(screen.getByText('Disponible cuando empieces a repasar')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Congelar mañana' })).toBeNull();
    expect(screen.getByText('Mis secciones')).toBeTruthy();
    expect(screen.getByText('SI3 · Sección 1')).toBeTruthy();
    expect(screen.getByText('Prof. María Hernández')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ayuda y guía de inicio' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Datos personales y contraseña' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
    expect(screen.queryByText(/sonido/i)).toBeNull();
  });

  it('shows the local streak and its freezes when it exists', async () => {
    const onFreeze = jest.fn();
    await setup({ streak: { currentDays: 6, freezesAvailable: 1 }, onFreeze });
    expect(screen.getByText('Racha de 6 días')).toBeTruthy();
    expect(screen.getByText('1 congelación disponible para un día sin repasar')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Congelar mañana' }));
    expect(onFreeze).toHaveBeenCalled();
  });

  it('saves each switch (RF-37, RF-55) and applies the vibration setting right away', async () => {
    const props = await setup();
    await fireEvent.press(screen.getByRole('switch', { name: 'Recordatorio diario' }));
    expect(props.onSavePreferences).toHaveBeenLastCalledWith({ notificationsEnabled: false });
    expect(screen.getByRole('switch', { name: 'Recordatorio diario' }).props.accessibilityState).toMatchObject({
      checked: false,
    });

    await fireEvent.press(screen.getByRole('switch', { name: 'Vibración' }));
    expect(props.onSavePreferences).toHaveBeenLastCalledWith({ vibrationEnabled: false });
    expect(setVibrationEnabled).toHaveBeenLastCalledWith(false);

    await fireEvent.press(screen.getByRole('switch', { name: 'Mostrar mi nombre en mazos públicos' }));
    expect(props.onSavePreferences).toHaveBeenLastCalledWith({ showNamePublicly: false });
  });

  it('restores the vibration setting and shows the message when saving fails', async () => {
    const onSavePreferences = jest.fn(async () => {
      throw new ApiError(0, 'NETWORK', 'No pudimos conectar con Memora. Revisa tu conexión a internet e intenta de nuevo.');
    });
    await setup({ onSavePreferences });
    await fireEvent.press(screen.getByRole('switch', { name: 'Vibración' }));
    expect(setVibrationEnabled).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('switch', { name: 'Vibración' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(
      screen.getByText('No pudimos conectar con Memora. Revisa tu conexión a internet e intenta de nuevo.'),
    ).toBeTruthy();
  });

  it('changes the reminder time and the daily new limit', async () => {
    const props = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Hora del recordatorio: 7:00 p. m.' }));
    await fireEvent.press(screen.getByRole('button', { name: 'picker-time' }));
    expect(props.onSavePreferences).toHaveBeenLastCalledWith({ reminderTime: '07:30' });
    expect(screen.getByText('7:30 a. m.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Más' }));
    expect(props.onSavePreferences).toHaveBeenLastCalledWith({ dailyNewLimit: 25 });
    expect(screen.getByText('25')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Menos' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Menos' }));
    expect(props.onSavePreferences).toHaveBeenLastCalledWith({ dailyNewLimit: 15 });
  });

  it('leaves a section only after confirming (RF-35)', async () => {
    const props = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Salir de SI3 · Sección 1' }));
    expect(props.onLeaveSection).not.toHaveBeenCalled();
    expect(screen.getByText('¿Salir de SI3 · Sección 1?')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('¿Salir de SI3 · Sección 1?')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Salir de SI3 · Sección 1' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salir de la sección' }));
    expect(props.onLeaveSection).toHaveBeenCalledWith(9);
  });

  it('hides Mis secciones without sections', async () => {
    await setup({ user: { ...user, enrollments: [] } });
    expect(screen.queryByText('Mis secciones')).toBeNull();
  });

  it('opens the guide and signs out', async () => {
    const props = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Ayuda y guía de inicio' }));
    expect(props.onOpenHelp).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(props.onSignOut).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(props.onBack).toHaveBeenCalled();
  });

  it('edits the optional birth date and sex (RF-56) and goes back to the settings', async () => {
    const props = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Datos personales y contraseña' }));
    expect(screen.getByRole('header', { name: 'Datos personales' })).toBeTruthy();
    expect(screen.getByText('V-20000001')).toBeTruthy();
    expect(screen.getByText('Luis Pérez')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Fecha de nacimiento: sin indicar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'picker-date' }));
    await fireEvent.press(screen.getByRole('button', { name: /^Sexo/ }));
    await fireEvent.press(screen.getByText('Femenino'));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(props.onSavePersonalData).toHaveBeenCalledWith({ birthDate: '2004-05-09', sex: 'female' });
    expect(screen.getByRole('header', { name: 'Ajustes y cuenta' })).toBeTruthy();
  });
});
