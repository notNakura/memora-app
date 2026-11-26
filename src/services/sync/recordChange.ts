// The one door for local writes (docs/07_sincronizacion.md: "Toda escritura local se registra también en
// pending_change (tabla, id, operación, JSON)"). Every flow that changes local data calls recordChange.
import type { ChangeOp } from '../api/sync';
import { type SyncDatabase, tableColumns, toBindValue } from './database';
import { isOnlineOnlyTable, NEVER_ON_PHONE, PRIMARY_KEYS } from './tables';

export const READ_ONLY_MESSAGE = 'Esta institución está suspendida: puedes consultar sus datos, pero no hacer cambios.';

/** Thrown when a write touches data of a suspended institution (read-only on the phone). */
export class ReadOnlyInstitutionError extends Error {
  constructor(readonly institutionId: number) {
    super(READ_ONLY_MESSAGE);
  }
}

type Row = Record<string, unknown>;

/** How a record reaches its institution through local data, first matching column wins. */
const INSTITUTION_PATHS: [column: string, sql: string][] = [
  ['card_id', `SELECT a.institution_id AS id FROM card c JOIN deck d ON d.deck_id = c.deck_id
      JOIN subject s ON s.subject_id = d.subject_id JOIN area a ON a.area_id = s.area_id WHERE c.card_id = ?`],
  ['deck_id', `SELECT a.institution_id AS id FROM deck d JOIN subject s ON s.subject_id = d.subject_id
      JOIN area a ON a.area_id = s.area_id WHERE d.deck_id = ?`],
  ['assessment_id', `SELECT a.institution_id AS id FROM assessment x JOIN deck d ON d.deck_id = x.deck_id
      JOIN subject s ON s.subject_id = d.subject_id JOIN area a ON a.area_id = s.area_id WHERE x.assessment_id = ?`],
  ['attempt_id', `SELECT a.institution_id AS id FROM attempt t JOIN assessment x ON x.assessment_id = t.assessment_id
      JOIN deck d ON d.deck_id = x.deck_id JOIN subject s ON s.subject_id = d.subject_id
      JOIN area a ON a.area_id = s.area_id WHERE t.attempt_id = ?`],
  ['subject_id', `SELECT a.institution_id AS id FROM subject s JOIN area a ON a.area_id = s.area_id WHERE s.subject_id = ?`],
];

/**
 * Institution a record belongs to, from local data; null for records that belong to the person rather than
 * an institution (streak, challenge) or whose parents are not on the phone.
 */
export async function institutionOfRecord(db: SyncDatabase, row: Row): Promise<number | null> {
  for (const [column, sql] of INSTITUTION_PATHS) {
    if (row[column] === undefined || row[column] === null) continue;
    const found = await db.getFirstAsync<{ id: number }>(sql, [toBindValue(row[column])]);
    if (found) return found.id;
  }
  return null;
}

/** Institution of a queued change: its payload completed with the local row it points to. */
export async function institutionOfChange(
  db: SyncDatabase,
  table: string,
  recordId: string,
  payload: Row,
): Promise<number | null> {
  let context = payload;
  if (PRIMARY_KEYS[table] && !isOnlineOnlyTable(table)) {
    const keys = PRIMARY_KEYS[table];
    const existing = await db.getFirstAsync<Row>(
      `SELECT * FROM ${table} WHERE ${keys.map((k) => `${k} = ?`).join(' AND ')}`,
      keyOf(table, recordId, payload),
    );
    context = { ...(existing ?? {}), ...payload };
  }
  return institutionOfRecord(db, context);
}

export async function isInstitutionReadOnly(db: SyncDatabase, institutionId: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ status: string }>('SELECT status FROM institution WHERE institution_id = ?', [
    institutionId,
  ]);
  return row?.status === 'suspended';
}

function keyOf(table: string, id: string | number | null, payload: Row) {
  const keys = PRIMARY_KEYS[table];
  const parts = id === null ? [] : String(id).split(':');
  return keys.map((k, i) => toBindValue(payload[k] ?? parts[i]));
}

/**
 * Writes the change to the local table and queues it in pending_change, atomically (a savepoint, so it also
 * works inside a caller's transaction).
 *
 * - `table`: any local table except email_code/audit_log. deck, card and card_option are online-only: the
 *   change is only queued as a draft (the server assigns their ids when publishing).
 * - `id`: the record id (UUID, integer, or composite key joined by ':' such as "attemptUuid:questionId");
 *   null for an insert whose integer id SQLite assigns (error_report).
 * - `op`: 'insert' (an upsert on the primary key), 'update' (only the given columns, by primary key) or 'delete'.
 * - `payload`: the row's columns; it is also the JSON the server receives. It must include the owner column
 *   (student_id, reporter_id) of upload tables.
 *
 * Returns the record id stored in pending_change. Throws ReadOnlyInstitutionError when the record belongs to a
 * suspended institution; nothing is written then.
 */
export async function recordChange(
  db: SyncDatabase,
  table: string,
  id: string | number | null,
  op: ChangeOp,
  payload: Row,
): Promise<string> {
  if ((NEVER_ON_PHONE as readonly string[]).includes(table) || !PRIMARY_KEYS[table]) {
    throw new Error(`recordChange: ${table} is not stored on the phone`);
  }
  const onlineOnly = isOnlineOnlyTable(table);
  const keys = PRIMARY_KEYS[table];

  let context = payload;
  if (op !== 'insert' && !onlineOnly) {
    const where = keys.map((k) => `${k} = ?`).join(' AND ');
    const existing = await db.getFirstAsync<Row>(`SELECT * FROM ${table} WHERE ${where}`, keyOf(table, id, payload));
    context = { ...(existing ?? {}), ...payload };
  }
  const institutionId = await institutionOfRecord(db, context);
  if (institutionId !== null && (await isInstitutionReadOnly(db, institutionId))) {
    throw new ReadOnlyInstitutionError(institutionId);
  }

  await db.execAsync('SAVEPOINT record_change;');
  try {
    let recordId = id === null ? null : String(id);
    if (!onlineOnly) {
      const columns = await tableColumns(db, table);
      const names = Object.keys(payload).filter((c) => columns.has(c) && payload[c] !== undefined);
      const values = names.map((c) => toBindValue(payload[c]));
      const where = keys.map((k) => `${k} = ?`).join(' AND ');
      if (op === 'insert') {
        const hasKey = keys.every((k) => names.includes(k));
        const updates = names.filter((c) => !keys.includes(c)).map((c) => `${c} = excluded.${c}`);
        const upsert = hasKey
          ? ` ON CONFLICT(${keys.join(', ')}) DO ${updates.length ? `UPDATE SET ${updates.join(', ')}` : 'NOTHING'}`
          : '';
        const result = await db.runAsync(
          `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})${upsert}`,
          values,
        );
        if (recordId === null) recordId = hasKey ? keys.map((k) => String(payload[k])).join(':') : String(result.lastInsertRowId);
      } else if (op === 'update') {
        const set = names.filter((c) => !keys.includes(c));
        if (set.length) {
          await db.runAsync(`UPDATE ${table} SET ${set.map((c) => `${c} = ?`).join(', ')} WHERE ${where}`, [
            ...set.map((c) => toBindValue(payload[c])),
            ...keyOf(table, id, payload),
          ]);
        }
      } else {
        await db.runAsync(`DELETE FROM ${table} WHERE ${where}`, keyOf(table, id, payload));
      }
    }
    if (recordId === null) recordId = keyOf(table, id, payload).join(':');
    await db.runAsync(
      'INSERT INTO pending_change (table_name, record_id, operation, payload_json) VALUES (?, ?, ?, ?)',
      [table, recordId, op, JSON.stringify(payload)],
    );
    await db.execAsync('RELEASE record_change;');
    return recordId;
  } catch (err) {
    await db.execAsync('ROLLBACK TO record_change; RELEASE record_change;');
    throw err;
  }
}
