import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError, NETWORK_ERROR_MESSAGE, type User } from '../../../services/api/client';
import { ProfileScreen } from '../ProfileScreen';
import type { SyncStatus } from '../preferences';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

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
  memberships: [],
  desiredRetention: 0.9,
  timeFactor: 1,
};

const offline: SyncStatus = { online: false, pendingReviews: 14, lastSyncedAt: null, syncing: false };

async function setup(overrides: Partial<React.ComponentProps<typeof ProfileScreen>> = {}) {
  const props = {
    user,
    subtitle: 'Estudiante · Sección 1 · SI3',
    sync: offline,
    onSync: jest.fn(),
    onSavePreferences: jest.fn(async () => undefined),
    onOpenInstitutions: jest.fn(),
    onOpenSettings: jest.fn(),
    ...overrides,
  };
  await wrap(<ProfileScreen {...props} />);
  return { props };
}

describe('ProfileScreen (21)', () => {
  it('shows the person, the sync status and every text of the mockup', async () => {
    await setup();
    expect(screen.getByRole('header', { name: 'Luis Pérez' })).toBeTruthy();
    expect(screen.getByText('LP', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Estudiante · Sección 1 · SI3')).toBeTruthy();
    expect(screen.getByText('Sin conexión')).toBeTruthy();
    expect(screen.getByText('14 repasos guardados en el teléfono')).toBeTruthy();
    expect(screen.getByText('Tiempo en retos y evaluaciones')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Tiempo normal. El que configure el profesor' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Tiempo extendido. 50 % más de tiempo en cada pregunta' })).toBeTruthy();
    expect(screen.getByText('Meta de retención')).toBeTruthy();
    expect(screen.getByText('Una meta más alta programa repasos más seguidos.')).toBeTruthy();
    for (const label of ['85 %', '90 %', '95 %']) expect(screen.getByRole('radio', { name: label })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '90 %' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole('radio', { name: 'Tiempo normal. El que configure el profesor' }).props.accessibilityState)
      .toMatchObject({ checked: true });
  });

  it('runs a sync from the banner', async () => {
    const { props } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar' }));
    expect(props.onSync).toHaveBeenCalled();
  });

  it('saves the extended time and the retention goal (RF-26)', async () => {
    const { props } = await setup();
    await fireEvent.press(screen.getByRole('radio', { name: 'Tiempo extendido. 50 % más de tiempo en cada pregunta' }));
    expect(props.onSavePreferences).toHaveBeenLastCalledWith({ timeFactor: 1.5 });
    expect(
      screen.getByRole('radio', { name: 'Tiempo extendido. 50 % más de tiempo en cada pregunta' }).props
        .accessibilityState,
    ).toMatchObject({ checked: true });

    await fireEvent.press(screen.getByRole('radio', { name: '95 %' }));
    expect(props.onSavePreferences).toHaveBeenLastCalledWith({ desiredRetention: 0.95 });
    expect(screen.getByRole('radio', { name: '95 %' }).props.accessibilityState).toMatchObject({ checked: true });

    await fireEvent.press(screen.getByRole('radio', { name: 'Tiempo normal. El que configure el profesor' }));
    expect(props.onSavePreferences).toHaveBeenLastCalledWith({ timeFactor: 1 });
  });

  it('goes back to the saved value and shows the error when saving fails (offline)', async () => {
    const onSavePreferences = jest.fn(async () => {
      throw new ApiError(0, 'NETWORK', NETWORK_ERROR_MESSAGE);
    });
    await setup({ onSavePreferences });
    await fireEvent.press(screen.getByRole('radio', { name: '85 %' }));
    expect(screen.getByText(NETWORK_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.getByRole('radio', { name: '85 %' }).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByRole('radio', { name: '90 %' }).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('opens Mis instituciones and Ajustes y cuenta', async () => {
    const { props } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Mis instituciones' }));
    expect(props.onOpenInstitutions).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajustes y cuenta' }));
    expect(props.onOpenSettings).toHaveBeenCalled();
  });
});
