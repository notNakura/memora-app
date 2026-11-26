import type { User } from '../../../services/api/client';
import {
  DEFAULT_PREFERENCES,
  formatReminderTime,
  initialsOf,
  preferencesOf,
  profileSubtitle,
  stepDailyLimit,
  streakText,
  syncStatusText,
} from '../preferences';

const user: User = {
  id: 1,
  email: 'luis.perez@gmail.com',
  emailVerified: true,
  profileComplete: true,
  nationalId: 'V-20000001',
  firstNames: 'Luis Alberto',
  lastNames: 'Pérez',
  birthDate: null,
  sex: null,
  onboardingCompleted: true,
  memberships: [
    { institutionId: 1, institutionName: 'UNERG', role: 'student', status: 'active', areaId: null },
    { institutionId: 1, institutionName: 'UNERG', role: 'teacher', status: 'active', areaId: null },
  ],
  enrollments: [
    { sectionId: 9, institutionId: 1, subjectName: 'SI3', sectionName: 'Sección 1', status: 'active' },
  ],
};

describe('preferences of screens 21 and 23', () => {
  it('fills the app_user defaults for an older server', () => {
    expect(preferencesOf(user)).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES).toEqual({
      desiredRetention: 0.9,
      timeFactor: 1,
      dailyNewLimit: 20,
      notificationsEnabled: true,
      vibrationEnabled: true,
      reminderTime: '19:00',
      showNamePublicly: true,
    });
    expect(preferencesOf({ ...user, dailyNewLimit: 35, vibrationEnabled: false })).toMatchObject({
      dailyNewLimit: 35,
      vibrationEnabled: false,
    });
  });

  it('shows the reminder time like the mockup ("7:00 p. m.")', () => {
    expect(formatReminderTime('19:00')).toBe('7:00 p. m.');
    expect(formatReminderTime('07:30')).toBe('7:30 a. m.');
    expect(formatReminderTime('12:05')).toBe('12:05 p. m.');
    expect(formatReminderTime('00:15')).toBe('12:15 a. m.');
  });

  it('steps the daily new limit by 5 inside 0-200', () => {
    expect(stepDailyLimit(20, 1)).toBe(25);
    expect(stepDailyLimit(20, -1)).toBe(15);
    expect(stepDailyLimit(0, -1)).toBe(0);
    expect(stepDailyLimit(200, 1)).toBe(200);
    expect(stepDailyLimit(22, 1)).toBe(25);
    expect(stepDailyLimit(22, -1)).toBe(20);
  });

  it('builds the name initials and the role subtitle ("Estudiante · Sección 1 · SI3")', () => {
    expect(initialsOf({ ...user, lastNames: 'Pérez Díaz' })).toBe('LP');
    expect(initialsOf({ ...user, firstNames: null, lastNames: null })).toBe('L');
    expect(profileSubtitle(user, 1, 'student')).toBe('Estudiante · Sección 1 · SI3');
    expect(profileSubtitle(user, 1, 'teacher')).toBe('Profesor · UNERG');
    expect(profileSubtitle(user, null, null)).toBe('Profesor · UNERG');
    expect(profileSubtitle({ ...user, memberships: [] }, null, null)).toBeNull();
  });

  it('describes the sync status', () => {
    expect(syncStatusText({ online: false, pendingReviews: 14, lastSyncedAt: null, syncing: false })).toEqual({
      title: 'Sin conexión',
      detail: '14 repasos guardados en el teléfono',
    });
    expect(syncStatusText({ online: false, pendingReviews: 1, lastSyncedAt: null, syncing: false }).detail).toBe(
      '1 repaso guardado en el teléfono',
    );
    expect(syncStatusText({ online: true, pendingReviews: 3, lastSyncedAt: null, syncing: false })).toEqual({
      title: 'Cambios por enviar',
      detail: '3 repasos guardados en el teléfono',
    });
    expect(
      syncStatusText({ online: true, pendingReviews: 0, lastSyncedAt: '2026-11-20T14:05:00', syncing: false }),
    ).toEqual({ title: 'Todo sincronizado', detail: 'Última vez: 20/11/2026, 2:05 p. m.' });
    expect(syncStatusText({ online: true, pendingReviews: 0, lastSyncedAt: null, syncing: false })).toEqual({
      title: 'Todo sincronizado',
      detail: 'No hay cambios por enviar',
    });
  });

  it('describes the streak or says it is not available yet', () => {
    expect(streakText(null)).toEqual({ title: 'Racha', detail: 'Disponible cuando empieces a repasar' });
    expect(streakText({ currentDays: 6, freezesAvailable: 1 })).toEqual({
      title: 'Racha de 6 días',
      detail: '1 congelación disponible para un día sin repasar',
    });
    expect(streakText({ currentDays: 1, freezesAvailable: 2 })).toEqual({
      title: 'Racha de 1 día',
      detail: '2 congelaciones disponibles para un día sin repasar',
    });
    expect(streakText({ currentDays: 0, freezesAvailable: 0 }).detail).toBe('Sin congelaciones disponibles');
  });
});
