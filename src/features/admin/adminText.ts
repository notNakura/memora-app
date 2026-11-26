// Spanish texts of the admin screens (34, 36, 37) built from API data. Grammatical gender is not adapted
// here: the admin never sees a member's sex individually (RNF-12), so member rows use the generic form.
import type { MembershipRole } from '../../services/api/client';
import type { AreaEntry, AuditEntry, JoinMode, MemberStatus } from '../../services/api/admin';

export const JOIN_MODES: { value: JoinMode; title: string; description: string }[] = [
  { value: 'open', title: 'Abierto', description: 'Entra quien tenga el código. Los profesores siempre quedan por confirmar.' },
  { value: 'approval', title: 'Con aprobación', description: 'Cada solicitud se revisa en Usuarios.' },
  {
    value: 'roster',
    title: 'Solo inscritos',
    description: 'Entran directo los de la lista de inscritos y el resto queda por confirmar.',
  },
];

const JOIN_MODE_LINE: Record<JoinMode, string> = {
  open: 'Ingreso abierto',
  approval: 'Ingreso con aprobación',
  roster: 'Ingreso solo inscritos',
};

/** "Ingreso con aprobación · 3 por confirmar" (design 34). */
export const joinLine = (mode: JoinMode, pending: number) =>
  pending > 0 ? `${JOIN_MODE_LINE[mode]} · ${pending} por confirmar` : JOIN_MODE_LINE[mode];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "12 materias · sin administrador de área", "9 materias · administra Ana Torres", "Sin administrador de área". */
export function areaLine(area: AreaEntry): string {
  const admins = area.admins.length
    ? `administra ${area.admins.map((a) => a.name).join(', ')}`
    : 'sin administrador de área';
  if (area.subjectCount === 0) return capitalize(admins);
  return `${area.subjectCount} ${area.subjectCount === 1 ? 'materia' : 'materias'} · ${admins}`;
}

export const ROLE_TITLES: Record<MembershipRole, string> = {
  student: 'Estudiante',
  teacher: 'Profesor',
  area_admin: 'Administrador de área',
  institution_admin: 'Administrador de la institución',
};

const STATUS_TEXT: Record<MemberStatus, string> = {
  active: 'activo',
  invited: 'en la lista de inscritos, aún sin cuenta activa',
  pending: 'por confirmar',
  rejected: 'solicitud rechazada',
  removed: 'retirado de la institución',
};

/** "Estudiante · activo", "Estudiante · retirado de la institución" (design 36). */
export const memberLine = (role: MembershipRole, status: MemberStatus, areaName?: string | null) =>
  `${ROLE_TITLES[role]}${areaName ? ` de ${areaName}` : ''} · ${STATUS_TEXT[status]}`;

const ROLE_REQUEST: Record<MembershipRole, string> = {
  student: 'Se registró como estudiante',
  teacher: 'Se registró como profesor',
  area_admin: 'Pide administrar un área',
  institution_admin: 'Pide administrar la institución',
};
export const requestLine = (role: MembershipRole) => ROLE_REQUEST[role];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** "10:12 a. m." */
export function clock(date: Date): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "hoy, 10:12 a. m.", "ayer, 6:40 p. m.", "lunes, 9:05 a. m." (this week), "2 nov, 4:15 p. m." (design 37). */
export function whenText(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const day =
    days === 0
      ? 'hoy'
      : days === 1
        ? 'ayer'
        : days > 1 && days < 7
          ? WEEKDAYS[date.getDay()]
          : `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return `${day}, ${clock(date)}`;
}

/** "hace 1 hora", "hace 5 minutos", "hace 2 días" (design 36, "Última importación"). */
export function agoText(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "inscritos_SI3_2026-II.csv: 30 usuarios creados, 2 filas con error." */
export function importSummary(r: { fileName: string | null; created: number; loaded: number; errors: number }): string {
  const parts = [plural(r.created, 'usuario creado', 'usuarios creados')];
  if (r.loaded > r.created) parts.push(plural(r.loaded - r.created, 'cuenta existente agregada', 'cuentas existentes agregadas'));
  if (r.errors > 0) parts.push(plural(r.errors, 'fila con error', 'filas con error'));
  const text = `${parts.join(', ')}.`;
  return r.fileName ? `${r.fileName}: ${text}` : capitalize(text);
}

type Values = Record<string, unknown> | null;
const field = (v: unknown, key: string) =>
  v && typeof v === 'object' && key in v ? String((v as Record<string, unknown>)[key] ?? '') : '';

/** Audit actions the admin can filter by (screen 37, "Filtrar"). */
export const AUDIT_ACTIONS: { value: string; label: string }[] = [
  { value: 'membership_approved', label: 'Solicitudes aprobadas' },
  { value: 'membership_rejected', label: 'Solicitudes rechazadas' },
  { value: 'role_changed', label: 'Cambios de rol' },
  { value: 'membership_removed', label: 'Miembros retirados' },
  { value: 'membership_reinstated', label: 'Miembros reincorporados' },
  { value: 'roster_imported', label: 'Importaciones de inscritos' },
  { value: 'email_corrected', label: 'Correos corregidos' },
  { value: 'admin_assigned', label: 'Administradores nombrados' },
  { value: 'admin_removed', label: 'Roles de administrador quitados' },
  { value: 'area_created', label: 'Áreas creadas' },
  { value: 'join_settings_changed', label: 'Cambios del ingreso' },
  { value: 'join_code_regenerated', label: 'Códigos nuevos' },
  { value: 'deck_hidden', label: 'Mazos ocultados' },
  { value: 'deck_restored', label: 'Mazos restaurados' },
  { value: 'card_hidden', label: 'Tarjetas ocultadas' },
];

/** What the person did, after the name: "importó 30 usuarios", "ocultó el mazo Física I – fórmulas". */
export function auditDescription(entry: AuditEntry): string {
  const n = entry.newValue as Values;
  const o = entry.oldValue as Values;
  const name = field(n, 'name');
  switch (entry.action) {
    case 'area_created':
      return `creó el área ${name}`;
    case 'area_renamed':
      return `cambió el nombre del área ${field(o, 'name')} a ${name}`;
    case 'area_deleted':
      return `eliminó el área ${field(o, 'name')}`;
    case 'admin_assigned':
      return field(n, 'areaName')
        ? `nombró a ${name} administrador del área ${field(n, 'areaName')}`
        : `nombró a ${name} administrador de la institución`;
    case 'admin_removed':
      return `quitó el rol de administrador a ${name}`;
    case 'join_settings_changed':
      return 'cambió el ingreso a la institución';
    case 'join_code_regenerated':
      return 'generó un código nuevo de la institución';
    case 'membership_approved':
      return `aprobó la solicitud de ${name}`;
    case 'membership_rejected':
      return `rechazó la solicitud de ${name}`;
    case 'role_changed':
      return `cambió el rol de ${name} a ${ROLE_TITLES[field(n, 'role') as MembershipRole]?.toLowerCase() ?? field(n, 'role')}`;
    case 'membership_removed':
      return `retiró a ${name} de la institución`;
    case 'membership_reinstated':
      return `reincorporó a ${name}`;
    case 'email_corrected':
      return `corrigió un correo de la lista de inscritos (${field(n, 'email')})`;
    case 'roster_imported':
      return `importó ${plural(Number(field(n, 'created') || 0), 'usuario', 'usuarios')}`;
    case 'deck_hidden':
      return `ocultó el mazo ${name}`;
    case 'deck_restored':
      return `restauró el mazo ${name}`;
    case 'deck_kept':
      return `mantuvo el mazo ${name}`;
    case 'card_hidden':
      return 'ocultó una tarjeta reportada';
    case 'card_restored':
      return 'restauró una tarjeta';
    default:
      return `hizo un cambio en ${entry.tableName}`;
  }
}

/** Second line of a log entry: the file of an import, or nothing extra, then the time. */
export function auditDetail(entry: AuditEntry, now?: Date): string {
  const file = entry.action === 'roster_imported' ? field(entry.newValue, 'fileName') : '';
  const when = whenText(entry.occurredAt, now);
  return file ? `${file} · ${when}` : capitalize(when);
}
