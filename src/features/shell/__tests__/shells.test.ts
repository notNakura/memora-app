import { SHELL_HREFS, SHELL_TABS, shellFor } from '../shells';

// Boot rows and tab bars of docs/08_navegacion.md.
describe('shellFor (docs/08_navegacion.md, Arranque)', () => {
  it('maps each role start screen to its shell', () => {
    expect(shellFor({ name: 'studentHome', screen: 6 })).toBe('student');
    expect(shellFor({ name: 'teacherDashboard', screen: 24 })).toBe('teacher');
    expect(shellFor({ name: 'institutionAdmin', screen: 34 })).toBe('admin');
    expect(shellFor({ name: 'academicManagement', screen: 35 })).toBe('areaAdmin');
  });

  it('keeps every other start screen outside the shells', () => {
    expect(shellFor({ name: 'guide', screen: 4 })).toBeNull();
    expect(shellFor({ name: 'joinSection', screen: 5 })).toBeNull();
    expect(shellFor({ name: 'myInstitutions', screen: 22 })).toBeNull();
    expect(shellFor({ name: 'registerInstitution', screen: 33 })).toBeNull();
  });

  it('opens each shell at its own path', () => {
    expect(SHELL_HREFS).toEqual({ student: '/student', teacher: '/teacher', admin: '/admin', areaAdmin: '/area-admin' });
  });
});

describe('SHELL_TABS (docs/08_navegacion.md, Barras de navegación)', () => {
  const summary = (shell: keyof typeof SHELL_TABS) => SHELL_TABS[shell].map((t) => `${t.label} (${t.screens.join(', ')})`);

  it('Estudiante: Hoy (6) · Mazos (17) · Evaluar (12) · Perfil (21)', () => {
    expect(summary('student')).toEqual(['Hoy (6)', 'Mazos (17)', 'Evaluar (12)', 'Perfil (21)']);
  });

  it('Profesor: Resumen (24) · Mazos (17) · Evaluaciones (30 y 32) · Perfil (21)', () => {
    expect(summary('teacher')).toEqual(['Resumen (24)', 'Mazos (17)', 'Evaluaciones (30, 32)', 'Perfil (21)']);
  });

  it('Administrador: Áreas (34) · Gestión académica (35) · Usuarios (36) · Moderación (37) · Perfil (21)', () => {
    expect(summary('admin')).toEqual([
      'Áreas (34)',
      'Gestión académica (35)',
      'Usuarios (36)',
      'Moderación (37)',
      'Perfil (21)',
    ]);
  });

  it('Administrador de área: Gestión académica (35) · Perfil (21)', () => {
    expect(summary('areaAdmin')).toEqual(['Gestión académica (35)', 'Perfil (21)']);
  });

  it('the first tab is the start screen of the shell and the last one is Perfil', () => {
    for (const tabs of Object.values(SHELL_TABS)) {
      expect(tabs[0].key).toBe('index');
      expect(tabs[tabs.length - 1].key).toBe('profile');
    }
  });
});
