// Spanish texts and small formatters shared by screens 24-28 (identifiers in English, interface in Spanish).
import { ApiError } from '../../services/api/client';
import type { AttentionReason, JoinMode, RosterStudent } from '../../services/api/teacher';

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** '2026-09-30' -> '30 sep'. */
export function shortDate(isoDate: string): string {
  const [, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export const percentText = (value: number | null) => (value === null ? '—' : `${value} %`);
export const percentLabel = (value: number | null) => (value === null ? 'sin datos todavía' : `${value} %`);

/** Mockup 26 wording of the three join modes (RF-63). */
export const JOIN_MODES: { key: JoinMode; title: string; description: string; label: string }[] = [
  { key: 'open', title: 'Abierto', description: 'Cualquiera con el código', label: 'Abierto' },
  { key: 'approval', title: 'Con aprobación', description: 'Revisas a cada persona', label: 'Con aprobación' },
  {
    key: 'roster',
    title: 'Solo inscritos',
    description: 'Los de la lista entran directo; el resto espera',
    label: 'Solo inscritos',
  },
];
export const joinModeLabel = (mode: JoinMode) => JOIN_MODES.find((m) => m.key === mode)?.label ?? mode;

export function daysAgoText(days: number | null): string {
  if (days === null) return 'Nunca';
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

/** CU-23 step 2: why a student needs attention (mockup 25 wording). */
export function attentionText(reason: AttentionReason, student: Pick<RosterStudent, 'daysSinceReview'>): string {
  switch (reason) {
    case 'below_minimum':
      return 'Debajo del mínimo';
    case 'inactive':
      return student.daysSinceReview === null ? 'Aún no repasa' : `${student.daysSinceReview} días sin repasar`;
    case 'plan_incomplete':
      return 'Plan de refuerzo sin completar';
    case 'assessment_missing':
      return 'No ha presentado la evaluación';
  }
}

/** "Carla Rojas" -> "CR". */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/** "V-20000002" -> "V-20.000.002". */
export function formatNationalId(id: string | null): string {
  if (!id) return '';
  const match = /^([VE])-(\d+)$/.exec(id);
  if (!match) return id;
  return `${match[1]}-${match[2].replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo.';
