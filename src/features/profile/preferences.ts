// Pure helpers of Perfil (21) and Ajustes y cuenta (23).
import type { MembershipRole, Preferences, User } from '../../services/api/client';
import { ROLE_LABELS } from '../institutions/MyInstitutionsScreen';

/** The app_user column defaults, used while the server does not send a preference. */
export const DEFAULT_PREFERENCES: Preferences = {
  desiredRetention: 0.9,
  timeFactor: 1,
  dailyNewLimit: 20,
  notificationsEnabled: true,
  vibrationEnabled: true,
  reminderTime: '19:00',
  showNamePublicly: true,
};

/** "Tiempo extendido": "50 % más de tiempo en cada pregunta" (design 21). */
export const EXTENDED_TIME_FACTOR = 1.5;
/** The three goals of design 21. */
export const RETENTION_OPTIONS = [0.85, 0.9, 0.95] as const;
export const DAILY_LIMIT_STEP = 5;
export const DAILY_LIMIT_MIN = 0;
export const DAILY_LIMIT_MAX = 200;

export function preferencesOf(user: User): Preferences {
  const out: Record<string, unknown> = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[]) {
    const value = user[key];
    if (value !== undefined && value !== null) out[key] = value;
  }
  return out as Preferences;
}

/** "19:00" -> "7:00 p. m." (design 23). */
export function formatReminderTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** Next multiple of the step in that direction, inside 0-200. */
export function stepDailyLimit(current: number, direction: 1 | -1): number {
  const next =
    direction === 1
      ? Math.floor(current / DAILY_LIMIT_STEP) * DAILY_LIMIT_STEP + DAILY_LIMIT_STEP
      : Math.ceil(current / DAILY_LIMIT_STEP) * DAILY_LIMIT_STEP - DAILY_LIMIT_STEP;
  return Math.min(DAILY_LIMIT_MAX, Math.max(DAILY_LIMIT_MIN, next));
}

/** "Luis Pérez" -> "LP"; without names, the first letter of the email. */
export function initialsOf(user: User): string {
  const first = user.firstNames?.trim()[0];
  const last = user.lastNames?.trim()[0];
  if (first || last) return `${first ?? ''}${last ?? ''}`.toUpperCase();
  return user.email.trim()[0]?.toUpperCase() ?? '';
}

const ROLE_ORDER: MembershipRole[] = ['institution_admin', 'area_admin', 'teacher', 'student'];

/**
 * Line under the name: "Estudiante · Sección 1 · SI3" for a student with an active section in the active
 * institution, otherwise the role and the institution. The role is the one chosen on screen 22, or the widest.
 */
export function profileSubtitle(
  user: User,
  activeInstitutionId: number | null,
  activeRole: MembershipRole | null,
): string | null {
  const active = user.memberships.filter((m) => m.status === 'active');
  const inInstitution = active.filter((m) => activeInstitutionId === null || m.institutionId === activeInstitutionId);
  const candidates = inInstitution.length > 0 ? inInstitution : active;
  const chosen =
    candidates.find((m) => m.role === activeRole) ??
    [...candidates].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))[0];
  if (!chosen) return null;
  if (chosen.role === 'student') {
    const section = (user.enrollments ?? []).find(
      (e) => e.status === 'active' && e.institutionId === chosen.institutionId,
    );
    if (section) return `${ROLE_LABELS.student} · ${section.sectionName} · ${section.subjectName}`;
  }
  return `${ROLE_LABELS[chosen.role]} · ${chosen.institutionName}`;
}

/** What the sync banner of screen 21 needs (latest sync_log row and pending changes). */
export type SyncStatus = {
  online: boolean;
  /** Reviews and other changes saved on the phone and not sent yet. */
  pendingReviews: number;
  /** sync_log.occurred_at of the latest successful sync, or null. */
  lastSyncedAt: string | null;
  syncing: boolean;
};

const pendingText = (n: number) =>
  n === 1 ? '1 repaso guardado en el teléfono' : `${n} repasos guardados en el teléfono`;

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  return `${date}, ${formatReminderTime(`${d.getHours()}:${d.getMinutes()}`)}`;
};

export function syncStatusText(status: SyncStatus): { title: string; detail: string } {
  if (!status.online) {
    return {
      title: 'Sin conexión',
      detail: status.pendingReviews > 0 ? pendingText(status.pendingReviews) : 'Lo que hagas se guarda en el teléfono',
    };
  }
  if (status.pendingReviews > 0) return { title: 'Cambios por enviar', detail: pendingText(status.pendingReviews) };
  return {
    title: 'Todo sincronizado',
    detail: status.lastSyncedAt ? `Última vez: ${formatDateTime(status.lastSyncedAt)}` : 'No hay cambios por enviar',
  };
}

/** Local `streak` row (built with the review flow), or null before the first review. */
export type StreakInfo = { currentDays: number; freezesAvailable: number };

export function streakText(streak: StreakInfo | null): { title: string; detail: string } {
  if (!streak) return { title: 'Racha', detail: 'Disponible cuando empieces a repasar' };
  const days = streak.currentDays === 1 ? '1 día' : `${streak.currentDays} días`;
  const f = streak.freezesAvailable;
  let detail = `${f} congelaciones disponibles para un día sin repasar`;
  if (f === 0) detail = 'Sin congelaciones disponibles';
  if (f === 1) detail = '1 congelación disponible para un día sin repasar';
  return { title: `Racha de ${days}`, detail };
}
