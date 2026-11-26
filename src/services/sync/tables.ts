// "Qué viaja en cada sentido" (docs/07_sincronizacion.md) as data the engine reads.

/** Se crean en el teléfono y se suben. */
export const UPLOAD_TABLES = [
  'review_log',
  'challenge',
  'challenge_card',
  'attempt',
  'answer',
  'card_state',
  'streak',
  'error_report',
  'deck_subscription',
] as const;

/** Se suben solo con conexión: offline they only exist as a draft in pending_change. */
export const ONLINE_ONLY_TABLES = ['deck', 'card', 'card_option'] as const;

/** Nunca están en el teléfono. */
export const NEVER_ON_PHONE = ['email_code', 'audit_log'] as const;

export const PRIMARY_KEYS: Record<string, string[]> = {
  app_user: ['user_id'],
  institution: ['institution_id'],
  area: ['area_id'],
  membership: ['membership_id'],
  academic_term: ['term_id'],
  subject: ['subject_id'],
  unit: ['unit_id'],
  section: ['section_id'],
  enrollment: ['section_id', 'student_id'],
  unit_unlock: ['student_id', 'unit_id'],
  deck: ['deck_id'],
  card: ['card_id'],
  card_option: ['option_id'],
  deck_endorsement: ['deck_id', 'section_id'],
  deck_assignment: ['deck_id', 'section_id'],
  deck_subscription: ['student_id', 'deck_id'],
  assessment: ['assessment_id'],
  question: ['question_id'],
  assessment_exception: ['assessment_id', 'student_id'],
  attempt: ['attempt_id'],
  answer: ['attempt_id', 'question_id'],
  reinforcement_plan: ['plan_id'],
  plan_card: ['plan_id', 'card_id'],
  review_log: ['review_id'],
  challenge: ['challenge_id'],
  challenge_card: ['challenge_id', 'card_id'],
  card_state: ['student_id', 'card_id'],
  streak: ['student_id'],
  error_report: ['report_id'],
  badge: ['badge_id'],
  user_badge: ['student_id', 'badge_id'],
  notification: ['notification_id'],
};

/**
 * Tables the server sends in full on every pull (see memora-api src/sync/pull.ts): rows missing from the
 * snapshot no longer belong on the phone and are deleted.
 */
export const SNAPSHOT_TABLES = new Set([
  'app_user', 'institution', 'membership', 'area', 'academic_term', 'subject', 'unit', 'section', 'enrollment',
  'unit_unlock', 'deck', 'card', 'card_option', 'deck_endorsement', 'deck_assignment', 'assessment', 'question',
  'assessment_exception', 'reinforcement_plan', 'plan_card', 'badge', 'user_badge',
]);

/** Local columns a pulled row never overwrites (the phone owns them). */
export const LOCAL_COLUMNS: Record<string, string[]> = { notification: ['read_at'] };

export const isUploadTable = (table: string) => (UPLOAD_TABLES as readonly string[]).includes(table);
export const isOnlineOnlyTable = (table: string) => (ONLINE_ONLY_TABLES as readonly string[]).includes(table);

/** record_id of a row: its primary key values joined by ':' (composite keys, e.g. answer "uuid:12"). */
export function recordIdOf(table: string, row: Record<string, unknown>): string {
  return (PRIMARY_KEYS[table] ?? []).map((k) => String(row[k])).join(':');
}
