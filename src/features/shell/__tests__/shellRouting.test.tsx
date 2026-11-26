// Router-level checks of the role shells (boot routing, tab bars, Perfil and switching view) with the real files of src/app/(app).
import { router as appRouter, Stack, type Href } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import type { ActiveInstitutionStore } from '../../../services/activeInstitutionStore';
import type { AuthApi, Membership, MembershipRole, User } from '../../../services/api/client';
import type { SignupChoiceStore } from '../../../services/signupChoiceStore';
import type { TokenStore } from '../../../services/tokenStore';
import { SessionProvider } from '../../auth/session';

import AppLayout from '../../../app/(app)/_layout';
import AppIndex from '../../../app/(app)/index';
import Institutions from '../../../app/(app)/institutions';
import JoinSection from '../../../app/(app)/join-section';
import RegisterInstitution from '../../../app/(app)/register-institution';
import Settings from '../../../app/(app)/settings';
import StudentLayout from '../../../app/(app)/student/_layout';
import StudentToday from '../../../app/(app)/student/index';
import StudentDecks from '../../../app/(app)/student/decks';
import StudentAssess from '../../../app/(app)/student/assess';
import StudentProfile from '../../../app/(app)/student/profile';
import TeacherLayout from '../../../app/(app)/teacher/_layout';
import TeacherSummary from '../../../app/(app)/teacher/index';
import TeacherDecks from '../../../app/(app)/teacher/decks';
import TeacherEvaluations from '../../../app/(app)/teacher/evaluations';
import TeacherProfile from '../../../app/(app)/teacher/profile';
import AdminLayout from '../../../app/(app)/admin/_layout';
import AdminAreas from '../../../app/(app)/admin/index';
import AdminAcademic from '../../../app/(app)/admin/academic';
import AdminUsers from '../../../app/(app)/admin/users';
import AdminModeration from '../../../app/(app)/admin/moderation';
import AdminProfile from '../../../app/(app)/admin/profile';
import AreaAdminLayout from '../../../app/(app)/area-admin/_layout';
import AreaAdminAcademic from '../../../app/(app)/area-admin/index';
import AreaAdminProfile from '../../../app/(app)/area-admin/profile';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-secure-store', () => ({}));
// The sync runner needs a SQLite provider; routing tests do not exercise sync.
jest.mock('../../../services/sync/SyncRunner', () => ({ SyncRunner: () => null }));
// Perfil (21) and Ajustes (23) read sync_log and streak from the local database: an empty one here.
const mockEmptyDb = { getFirstAsync: async () => null };
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockEmptyDb }));

const baseUser: User = {
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
  enrollments: [],
};
const membership = (role: MembershipRole, institutionId = 1, institutionName = 'UNERG'): Membership => ({
  institutionId,
  institutionName,
  role,
  status: 'active',
  areaId: role === 'area_admin' ? 3 : null,
});

type MemoryActive = ActiveInstitutionStore & { value: number | null; role: MembershipRole | null };

let currentUser: User = baseUser;
let active: MemoryActive;
let tokenValue: string | null = 'r';

const api = {
  refresh: jest.fn(async () => ({ user: currentUser, accessToken: 'a', refreshToken: 'r' })),
} as unknown as AuthApi;
const tokens: TokenStore = {
  get: async () => tokenValue,
  set: async (t: string) => {
    tokenValue = t;
  },
  clear: async () => {
    tokenValue = null;
  },
};
const choices: SignupChoiceStore = { get: async () => null, set: async () => undefined, clear: async () => undefined };

function memoryActive(value: number | null, role: MembershipRole | null): MemoryActive {
  const store: MemoryActive = {
    value,
    role,
    get: async () => store.value,
    getRole: async () => store.role,
    set: async (id, r) => {
      store.value = id;
      store.role = r ?? null;
    },
    clear: async () => {
      store.value = null;
      store.role = null;
    },
  };
  return store;
}

function TestRoot() {
  return (
    <SessionProvider api={api} store={tokens} choiceStore={choices} activeStore={active}>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}

const routes = {
  _layout: TestRoot,
  '(app)/_layout': AppLayout,
  '(app)/index': AppIndex,
  '(app)/institutions': Institutions,
  '(app)/join-section': JoinSection,
  '(app)/register-institution': RegisterInstitution,
  '(app)/settings': Settings,
  '(app)/student/_layout': StudentLayout,
  '(app)/student/index': StudentToday,
  '(app)/student/decks': StudentDecks,
  '(app)/student/assess': StudentAssess,
  '(app)/student/profile': StudentProfile,
  '(app)/teacher/_layout': TeacherLayout,
  '(app)/teacher/index': TeacherSummary,
  '(app)/teacher/decks': TeacherDecks,
  '(app)/teacher/evaluations': TeacherEvaluations,
  '(app)/teacher/profile': TeacherProfile,
  '(app)/admin/_layout': AdminLayout,
  '(app)/admin/index': AdminAreas,
  '(app)/admin/academic': AdminAcademic,
  '(app)/admin/users': AdminUsers,
  '(app)/admin/moderation': AdminModeration,
  '(app)/admin/profile': AdminProfile,
  '(app)/area-admin/_layout': AreaAdminLayout,
  '(app)/area-admin/index': AreaAdminAcademic,
  '(app)/area-admin/profile': AreaAdminProfile,
};

async function boot(memberships: Membership[], stored: { institutionId?: number | null; role?: MembershipRole | null } = {}) {
  currentUser = { ...baseUser, memberships };
  tokenValue = 'r';
  active = memoryActive(stored.institutionId ?? null, stored.role ?? null);
  const result = await renderRouter(routes, { initialUrl: '/' });
  await screen.findAllByRole('tab');
  return result;
}

const tabLabels = () => screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel);
const press = (node: Parameters<typeof fireEvent.press>[0]) => act(async () => fireEvent.press(node));

describe('role shells (boot routing, tab bars)', () => {
  it('Institución activa con rol de estudiante | Inicio del estudiante (6)', async () => {
    const router = await boot([membership('student')]);
    expect(router.getPathname()).toBe('/student');
    expect(tabLabels()).toEqual(['Hoy', 'Mazos', 'Evaluar', 'Perfil']);
    expect(screen.getByRole('tab', { name: 'Hoy' })).toBeSelected();
    expect(screen.getByText('Inicio del estudiante (6) aún no está disponible.')).toBeTruthy();
  });

  it('Institución activa con rol de profesor | Panel docente (24)', async () => {
    const router = await boot([membership('teacher')]);
    expect(router.getPathname()).toBe('/teacher');
    expect(screen.getByLabelText('Navegación docente')).toBeTruthy();
    expect(tabLabels()).toEqual(['Resumen', 'Mazos', 'Evaluaciones', 'Perfil']);
  });

  it('Institución activa con rol de administrador de la institución | Áreas y administradores (34)', async () => {
    const router = await boot([membership('institution_admin')]);
    expect(router.getPathname()).toBe('/admin');
    expect(tabLabels()).toEqual(['Áreas', 'Gestión académica', 'Usuarios', 'Moderación', 'Perfil']);
    expect(screen.getByLabelText('Navegación de administración')).toBeTruthy();
  });

  it('Institución activa con rol de administrador de área | Gestión académica (35)', async () => {
    const router = await boot([membership('area_admin')]);
    expect(router.getPathname()).toBe('/area-admin');
    expect(tabLabels()).toEqual(['Gestión académica', 'Perfil']);
    expect(screen.getByLabelText('Navegación de administración')).toBeTruthy();
  });

  it('varios roles en la misma institución arranca en el de mayor alcance', async () => {
    const router = await boot([membership('teacher'), membership('institution_admin')], { institutionId: 1 });
    expect(router.getPathname()).toBe('/admin');
  });

  it('honors the role stored on the phone', async () => {
    const router = await boot([membership('teacher'), membership('institution_admin')], { institutionId: 1, role: 'teacher' });
    expect(router.getPathname()).toBe('/teacher');
  });

  it('a tab opens its placeholder and becomes the selected tab', async () => {
    const router = await boot([membership('teacher')]);
    await press(screen.getByRole('tab', { name: 'Evaluaciones' }));
    expect(router.getPathname()).toBe('/teacher/evaluations');
    expect(screen.getByRole('tab', { name: 'Evaluaciones' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Resumen' })).not.toBeSelected();
    expect(screen.getByText('Evaluaciones (30 y 32) aún no está disponible.')).toBeTruthy();
  });

  it('a shell that is not the active one sends the person back to the right shell', async () => {
    const router = await boot([membership('student')]);
    await act(async () => appRouter.push('/admin' as Href));
    await screen.findByText('Inicio del estudiante (6) aún no está disponible.');
    expect(router.getPathname()).toBe('/student');
  });
});

describe('Perfil and switching view from Mis instituciones', () => {
  it('Perfil opens Mis instituciones (22) and Ajustes (23)', async () => {
    const router = await boot([membership('student')]);
    await press(screen.getByRole('tab', { name: 'Perfil' }));
    await press(screen.getByRole('button', { name: 'Ajustes y cuenta' }));
    expect(router.getPathname()).toBe('/settings');
    expect(screen.getByRole('header', { name: 'Ajustes y cuenta' })).toBeTruthy();
    await press(screen.getByRole('button', { name: 'Volver' }));
    await press(screen.getByRole('button', { name: 'Mis instituciones' }));
    expect(router.getPathname()).toBe('/institutions');
    expect(screen.getByRole('header', { name: 'Mis instituciones' })).toBeTruthy();
  });

  it('choosing another role row on 22 switches the shell and stores the role', async () => {
    const router = await boot([membership('teacher'), membership('institution_admin')], { institutionId: 1 });
    expect(router.getPathname()).toBe('/admin');
    await press(screen.getByRole('tab', { name: 'Perfil' }));
    await press(screen.getByRole('button', { name: 'Mis instituciones' }));
    await press(screen.getByRole('radio', { name: /UNERG. Profesor/ }));

    await screen.findByLabelText('Navegación docente');
    expect(router.getPathname()).toBe('/teacher');
    expect(tabLabels()).toEqual(['Resumen', 'Mazos', 'Evaluaciones', 'Perfil']);
    expect(active.value).toBe(1);
    expect(active.role).toBe('teacher');
  });

  it('choosing another institution on 22 switches to the shell of its role', async () => {
    const router = await boot([membership('teacher', 1), membership('student', 2, 'Curso de Inglés')], { institutionId: 1 });
    expect(router.getPathname()).toBe('/teacher');
    await press(screen.getByRole('tab', { name: 'Perfil' }));
    await press(screen.getByRole('button', { name: 'Mis instituciones' }));
    await press(screen.getByRole('radio', { name: /Curso de Inglés/ }));

    await screen.findByText('Inicio del estudiante (6) aún no está disponible.');
    expect(router.getPathname()).toBe('/student');
    expect(active.value).toBe(2);
    expect(active.role).toBeNull();
  });

  it('Cerrar sesión from Perfil, in Ajustes y cuenta (23), ends the session on the phone', async () => {
    await boot([membership('student')], { institutionId: 1 });
    await press(screen.getByRole('tab', { name: 'Perfil' }));
    await press(screen.getByRole('button', { name: 'Ajustes y cuenta' }));
    await press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(tokenValue).toBeNull();
    expect(active.value).toBeNull();
  });
});
