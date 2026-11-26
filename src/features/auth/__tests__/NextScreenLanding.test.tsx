import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { User } from '../../../services/api/client';
import { NextScreenLanding } from '../NextScreenLanding';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

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
  onboardingCompleted: false,
  memberships: [],
};

const renderLanding = (props: Partial<Parameters<typeof NextScreenLanding>[0]> = {}) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <NextScreenLanding user={user} signupChoice={null} onSignOut={jest.fn()} {...props} />
    </SafeAreaProvider>,
  );

describe('NextScreenLanding (temporary)', () => {
  it('says the next screen is Unirse a una sección by default', async () => {
    await renderLanding();
    expect(screen.getByText('Siguiente pantalla: Unirse a una sección (5). Aún no está disponible.')).toBeTruthy();
  });

  it('says Mis instituciones for the teacher choice', async () => {
    await renderLanding({ signupChoice: 'teacher' });
    expect(screen.getByText(/Mis instituciones \(22\)/)).toBeTruthy();
  });

  it('says the role screen with an active membership', async () => {
    const memberships = [{ institutionId: 1, institutionName: 'UNERG', role: 'teacher' as const, status: 'active' as const, areaId: null }];
    await renderLanding({ user: { ...user, memberships } });
    expect(screen.getByText(/Panel docente \(24\)/)).toBeTruthy();
  });

  it('signs out', async () => {
    const onSignOut = jest.fn();
    await renderLanding({ onSignOut });
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onSignOut).toHaveBeenCalled();
  });
});
