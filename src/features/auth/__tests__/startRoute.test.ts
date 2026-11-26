import type { Membership, User } from '../../../services/api/client';
import { appStartRoute, startRoute } from '../startRoute';

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
  onboardingCompleted: false,
  memberships: [],
};
const user = (patch: Partial<User> = {}): User => ({ ...baseUser, ...patch });
const membership = (
  role: Membership['role'],
  status: Membership['status'] = 'active',
  institutionId = 1,
): Membership => ({
  institutionId,
  institutionName: 'UNERG',
  role,
  status,
  areaId: role === 'area_admin' ? 3 : null,
});

// One case per row of docs/08_navegacion.md "Arranque" reachable from the app.
describe('startRoute', () => {
  it('Sin sesión → Ingreso (1)', () => {
    expect(startRoute(null, null)).toEqual({ name: 'access', screen: 1 });
  });

  it('Sesión con correo sin verificar → Verifica tu correo (2)', () => {
    expect(startRoute(user({ emailVerified: false, profileComplete: false }), 'student')).toEqual({
      name: 'verifyEmail',
      screen: 2,
    });
  });

  it('Correo verificado sin datos personales → Completa tus datos (3)', () => {
    expect(startRoute(user({ profileComplete: false }), null)).toEqual({ name: 'completeProfile', screen: 3 });
  });

  it('Sin membresía activa y elección estudiante → Unirse a una sección (5)', () => {
    expect(startRoute(user({ memberships: [membership('student', 'pending')] }), 'student')).toEqual({
      name: 'joinSection',
      screen: 5,
    });
  });

  it('Sin membresía activa y elección profesor → Mis instituciones (22)', () => {
    expect(startRoute(user(), 'teacher')).toEqual({ name: 'myInstitutions', screen: 22 });
  });

  it('Sin membresía activa ni elección guardada → Unirse a una sección (5) por defecto', () => {
    expect(startRoute(user(), null)).toEqual({ name: 'joinSection', screen: 5 });
  });

  it('Rol de estudiante → Inicio del estudiante (6)', () => {
    expect(startRoute(user({ memberships: [membership('student')] }), 'teacher')).toEqual({
      name: 'studentHome',
      screen: 6,
    });
  });

  it('Rol de profesor → Panel docente (24)', () => {
    expect(startRoute(user({ memberships: [membership('teacher')] }), null)).toEqual({
      name: 'teacherDashboard',
      screen: 24,
    });
  });

  it('Administrador de la institución → Áreas y administradores (34)', () => {
    expect(startRoute(user({ memberships: [membership('institution_admin')] }), null)).toEqual({
      name: 'institutionAdmin',
      screen: 34,
    });
  });

  it('Administrador de área → Gestión académica (35)', () => {
    expect(startRoute(user({ memberships: [membership('area_admin')] }), null)).toEqual({
      name: 'academicManagement',
      screen: 35,
    });
  });

  it('Varios roles → arranca en el de mayor alcance', () => {
    const memberships = [membership('student'), membership('teacher'), membership('area_admin'), membership('institution_admin', 'pending')];
    expect(startRoute(user({ memberships }), null)).toEqual({ name: 'academicManagement', screen: 35 });
  });
});

// Onboarding rows: the guide, Registrar mi institución and the stored active institution. Every startRoute row above keeps its result.
describe('appStartRoute', () => {
  const done = (patch: Partial<User> = {}) => user({ onboardingCompleted: true, ...patch });

  it('keeps 1, 2 and 3 before the guide', () => {
    expect(appStartRoute(null, null)).toEqual({ name: 'access', screen: 1 });
    expect(appStartRoute(user({ emailVerified: false, profileComplete: false }), null)).toEqual({ name: 'verifyEmail', screen: 2 });
    expect(appStartRoute(user({ profileComplete: false }), 'institution')).toEqual({ name: 'completeProfile', screen: 3 });
  });

  it('datos completos y guía sin terminar → Guía de inicio (4), antes que 5/22/6/24/34/35', () => {
    expect(appStartRoute(user(), 'student')).toEqual({ name: 'guide', screen: 4 });
    expect(appStartRoute(user(), 'teacher')).toEqual({ name: 'guide', screen: 4 });
    expect(appStartRoute(user({ memberships: [membership('institution_admin')] }), null)).toEqual({ name: 'guide', screen: 4 });
  });

  it('after the guide it gives the same screen as startRoute', () => {
    expect(appStartRoute(done(), 'student')).toEqual({ name: 'joinSection', screen: 5 });
    expect(appStartRoute(done(), 'teacher')).toEqual({ name: 'myInstitutions', screen: 22 });
    expect(appStartRoute(done({ memberships: [membership('teacher')] }), null)).toEqual({ name: 'teacherDashboard', screen: 24 });
  });

  it('elección institución, después de la guía y sin membresía activa → Registrar mi institución (33)', () => {
    expect(appStartRoute(user(), 'institution')).toEqual({ name: 'guide', screen: 4 });
    expect(appStartRoute(done(), 'institution')).toEqual({ name: 'registerInstitution', screen: 33 });
    expect(appStartRoute(done({ memberships: [membership('institution_admin')] }), 'institution')).toEqual({
      name: 'institutionAdmin',
      screen: 34,
    });
  });

  it('la institución activa guardada decide el rol (Mis instituciones, 22)', () => {
    const memberships = [membership('institution_admin', 'active', 1), membership('student', 'active', 2)];
    expect(appStartRoute(done({ memberships }), null, 2)).toEqual({ name: 'studentHome', screen: 6 });
    expect(startRoute(done({ memberships }), null, 2)).toEqual({ name: 'studentHome', screen: 6 });
    expect(appStartRoute(done({ memberships }), null, 1)).toEqual({ name: 'institutionAdmin', screen: 34 });
  });

  it('a stored institution without an active membership falls back to the widest role', () => {
    const memberships = [membership('teacher', 'active', 1), membership('student', 'pending', 2)];
    expect(appStartRoute(done({ memberships }), null, 2)).toEqual({ name: 'teacherDashboard', screen: 24 });
    expect(appStartRoute(done({ memberships }), null, 99)).toEqual({ name: 'teacherDashboard', screen: 24 });
  });
});

// The role chosen on screen 22 is stored next to the active institution.
describe('startRoute with the stored active role', () => {
  const done = (patch: Partial<User> = {}) => user({ onboardingCompleted: true, ...patch });
  const teacherAndAdmin = [membership('teacher', 'active', 1), membership('institution_admin', 'active', 1)];

  it('without a stored role, several roles in the same institution start in the widest one', () => {
    expect(appStartRoute(done({ memberships: teacherAndAdmin }), null, 1)).toEqual({ name: 'institutionAdmin', screen: 34 });
    expect(appStartRoute(done({ memberships: teacherAndAdmin }), null, 1, null)).toEqual({ name: 'institutionAdmin', screen: 34 });
  });

  it('honors the stored role when it is active in the active institution', () => {
    expect(startRoute(done({ memberships: teacherAndAdmin }), null, 1, 'teacher')).toEqual({ name: 'teacherDashboard', screen: 24 });
    expect(appStartRoute(done({ memberships: teacherAndAdmin }), null, 1, 'teacher')).toEqual({ name: 'teacherDashboard', screen: 24 });
  });

  it('ignores a stored role the person does not hold actively in that institution', () => {
    const memberships = [...teacherAndAdmin, membership('student', 'active', 2), membership('area_admin', 'pending', 1)];
    expect(appStartRoute(done({ memberships }), null, 1, 'student')).toEqual({ name: 'institutionAdmin', screen: 34 });
    expect(appStartRoute(done({ memberships }), null, 1, 'area_admin')).toEqual({ name: 'institutionAdmin', screen: 34 });
  });

  it('ignores the stored role when the stored institution is not active (widest role overall)', () => {
    const memberships = [membership('teacher', 'active', 1), membership('student', 'active', 2)];
    expect(appStartRoute(done({ memberships }), null, 99, 'student')).toEqual({ name: 'teacherDashboard', screen: 24 });
  });

  it('keeps the guide and screen 33 before any role screen', () => {
    expect(appStartRoute(user({ memberships: teacherAndAdmin }), null, 1, 'teacher')).toEqual({ name: 'guide', screen: 4 });
    expect(appStartRoute(done(), 'institution', null, 'teacher')).toEqual({ name: 'registerInstitution', screen: 33 });
  });
});
