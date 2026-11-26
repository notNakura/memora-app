import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { User } from '../../../services/api/client';
import { ProfilePlaceholder } from '../ProfilePlaceholder';
import { ShellPlaceholder } from '../ShellPlaceholder';

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
};

describe('ShellPlaceholder', () => {
  it('shows the screen name and number', async () => {
    await wrap(<ShellPlaceholder title="Mazos" screens={[17]} />);
    expect(screen.getByRole('header', { name: 'Mazos' })).toBeTruthy();
    expect(screen.getByText('Mazos (17) aún no está disponible.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  });

  it('joins several screen numbers and offers Volver when pushed', async () => {
    const onBack = jest.fn();
    await wrap(<ShellPlaceholder title="Evaluaciones" screens={[30, 32]} onBack={onBack} />);
    expect(screen.getByText('Evaluaciones (30 y 32) aún no está disponible.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('ProfilePlaceholder (Desde Perfil (21) todos llegan a Mis instituciones (22) y Ajustes (23))', () => {
  it('opens Mis instituciones, Ajustes and signs out', async () => {
    const handlers = { onOpenInstitutions: jest.fn(), onOpenSettings: jest.fn(), onSignOut: jest.fn() };
    await wrap(<ProfilePlaceholder user={user} {...handlers} />);
    expect(screen.getByRole('header', { name: 'Perfil' })).toBeTruthy();
    expect(screen.getByText('Luis Pérez')).toBeTruthy();
    expect(screen.getByText('luis.perez@gmail.com')).toBeTruthy();
    expect(screen.getByText('Perfil (21) aún no está disponible.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Mis instituciones' }));
    expect(handlers.onOpenInstitutions).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajustes' }));
    expect(handlers.onOpenSettings).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(handlers.onSignOut).toHaveBeenCalled();
  });
});
