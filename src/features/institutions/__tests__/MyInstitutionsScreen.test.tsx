import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError, type Membership, type User } from '../../../services/api/client';
import type { JoinOutcome } from '../../../services/api/onboarding';
import { MyInstitutionsScreen } from '../MyInstitutionsScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const unerg: Membership = {
  institutionId: 1,
  institutionName: 'UNERG',
  role: 'student',
  status: 'active',
  areaId: null,
  institutionType: 'university',
  sectionCount: 2,
};
const english: Membership = {
  institutionId: 2,
  institutionName: 'Curso de Inglés Nivel 1',
  role: 'student',
  status: 'active',
  areaId: null,
  institutionType: 'course',
  sectionCount: 1,
};

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
  memberships: [unerg, english],
  enrollments: [],
};

type Props = Parameters<typeof MyInstitutionsScreen>[0];
async function renderScreen(props: Partial<Props> = {}) {
  const handlers: Props = {
    user,
    activeInstitutionId: 1,
    signupChoice: null,
    onSelect: jest.fn(async () => undefined),
    onJoinInstitution: jest.fn(async (): Promise<JoinOutcome> => 'pending'),
    onSectionCode: jest.fn(),
    onRegisterInstitution: jest.fn(),
    ...props,
  };
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MyInstitutionsScreen {...handlers} />
    </SafeAreaProvider>,
  );
  return handlers;
}

const typeCode = (code: string) => fireEvent.changeText(screen.getByLabelText('Unirme a otra institución'), code);
const pressJoin = () => fireEvent.press(screen.getByRole('button', { name: 'Unirme' }));

describe('MyInstitutionsScreen (pantalla 22, RF-59, CU-35)', () => {
  it('shows the texts of the design', async () => {
    await renderScreen();
    expect(screen.getByRole('header', { name: 'Mis instituciones' })).toBeTruthy();
    expect(
      screen.getByText(
        'Tu repaso del día reúne las tarjetas de todas. Elige la institución activa para ver sus secciones, mazos y evaluaciones.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Institución activa')).toBeTruthy();
    expect(
      screen.getByText(
        'Pide el código de 8 caracteres a la institución. Si te unes con el código de una sección, quedas en su institución automáticamente.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar mi institución' })).toBeTruthy();
    expect(screen.getByPlaceholderText('K7M2P9QA')).toBeTruthy();
  });

  it('lists each active institution with role, type and sections; the stored one is selected', async () => {
    await renderScreen();
    expect(screen.getByRole('radio', { name: 'UNERG. Estudiante · Universidad · 2 secciones' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Curso de Inglés Nivel 1. Estudiante · Curso · 1 sección' })).not.toBeChecked();
  });

  it('choosing an institution makes it the active one', async () => {
    const { onSelect } = await renderScreen();
    await fireEvent.press(screen.getByRole('radio', { name: /Curso de Inglés Nivel 1/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('pending memberships and enrollments are listed with "Por confirmar" and cannot be chosen', async () => {
    const pendingMembership: Membership = { ...unerg, institutionId: 5, institutionName: 'IUTAG', status: 'pending', role: 'teacher' };
    const pendingEnrollment = {
      sectionId: 3,
      institutionId: 1,
      subjectName: 'Cálculo I',
      sectionName: 'Sección 2',
      status: 'pending' as const,
    };
    await renderScreen({
      user: { ...user, memberships: [unerg, pendingMembership], enrollments: [pendingEnrollment] },
    });
    expect(screen.queryByRole('radio', { name: /IUTAG/ })).toBeNull();
    expect(screen.getByText('IUTAG · Profesor')).toBeTruthy();
    expect(screen.getByText('Cálculo I · Sección 2')).toBeTruthy();
    expect(screen.getAllByText('Por confirmar')).toHaveLength(2);
  });

  it('a 6-character code is a section code: it opens Unirse a una sección with it', async () => {
    const { onSectionCode, onJoinInstitution } = await renderScreen();
    await typeCode('sk3a26');
    await pressJoin();
    expect(onSectionCode).toHaveBeenCalledWith('SK3A26');
    expect(onJoinInstitution).not.toHaveBeenCalled();
  });

  it('an 8-character code joins the institution with the role chosen at signup', async () => {
    const { onJoinInstitution } = await renderScreen({ signupChoice: 'teacher' });
    await typeCode('k7m2 p9qa');
    await pressJoin();
    expect(onJoinInstitution).toHaveBeenCalledWith('K7M2P9QA', 'teacher');
    expect(await screen.findByText('Tu solicitud quedó por confirmar. La institución la revisará.')).toBeTruthy();
  });

  it('without a stored teacher choice the institution code asks for the student role', async () => {
    const { onJoinInstitution } = await renderScreen({
      onJoinInstitution: jest.fn(async (): Promise<JoinOutcome> => 'active'),
    });
    await typeCode('K7M2P9QA');
    await pressJoin();
    expect(onJoinInstitution).toHaveBeenCalledWith('K7M2P9QA', 'student');
    expect(await screen.findByText('Te uniste a la institución.')).toBeTruthy();
  });

  it('a code of another length or with I, O, 0 or 1 is not sent', async () => {
    const { onSectionCode, onJoinInstitution } = await renderScreen();
    await typeCode('K7M2P');
    await pressJoin();
    expect(screen.getByText('Escribe un código de 6 u 8 caracteres.')).toBeTruthy();
    await typeCode('K7M2P9Q0');
    await pressJoin();
    expect(screen.getByText('El código solo usa los números del 2 al 9 y letras sin I ni O.')).toBeTruthy();
    expect(onSectionCode).not.toHaveBeenCalled();
    expect(onJoinInstitution).not.toHaveBeenCalled();
  });

  it('shows the server message when the institution code fails', async () => {
    await renderScreen({
      onJoinInstitution: jest.fn(() =>
        Promise.reject(new ApiError(410, 'JOIN_CODE_EXPIRED', 'Ese código ya venció. Pide uno nuevo a tu institución.')),
      ),
    });
    await typeCode('K7M2P9QA');
    await pressJoin();
    expect(await screen.findByText('Ese código ya venció. Pide uno nuevo a tu institución.')).toBeTruthy();
  });

  it('opens Registrar mi institución (33) and shows Volver only when there is a way back', async () => {
    const onBack = jest.fn();
    const { onRegisterInstitution } = await renderScreen({ onBack });
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar mi institución' }));
    expect(onRegisterInstitution).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('without memberships it does not show an empty radio group', async () => {
    await renderScreen({ user: { ...user, memberships: [] }, activeInstitutionId: null });
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  });

  describe('one row per role when an institution has several', () => {
    const teacher: Membership = { ...unerg, role: 'teacher' };
    const admin: Membership = { ...unerg, role: 'institution_admin', sectionCount: undefined };
    const several = { ...user, memberships: [teacher, admin, english] };

    it('lists one row per active role of the same institution, widest first', async () => {
      await renderScreen({ user: several });
      const rows = screen.getAllByRole('radio');
      expect(rows.map((r) => r.props.accessibilityLabel)).toEqual([
        'UNERG. Administrador · Universidad',
        'UNERG. Profesor · Universidad · 2 secciones',
        'Curso de Inglés Nivel 1. Estudiante · Curso · 1 sección',
      ]);
    });

    it('without a stored role the widest role of the active institution is selected', async () => {
      await renderScreen({ user: several });
      expect(screen.getByRole('radio', { name: /UNERG. Administrador/ })).toBeChecked();
      expect(screen.getByRole('radio', { name: /UNERG. Profesor/ })).not.toBeChecked();
    });

    it('the stored role is the selected row', async () => {
      await renderScreen({ user: several, activeRole: 'teacher' });
      expect(screen.getByRole('radio', { name: /UNERG. Profesor/ })).toBeChecked();
      expect(screen.getByRole('radio', { name: /UNERG. Administrador/ })).not.toBeChecked();
    });

    it('choosing a role row sends the institution and the role', async () => {
      const { onSelect } = await renderScreen({ user: several });
      await fireEvent.press(screen.getByRole('radio', { name: /UNERG. Profesor/ }));
      expect(onSelect).toHaveBeenCalledWith(1, 'teacher');
    });
  });
});
