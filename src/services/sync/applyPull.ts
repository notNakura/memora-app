// Writes a pull into the local replica and applies "Suspensión o retiro" (docs/07_sincronizacion.md).
import type { PullResponse, SyncRow } from '../api/sync';
import { type SyncDatabase, tableColumns, toBindValue, withForeignKeysOff } from './database';
import { institutionOfChange } from './recordChange';
import { LOCAL_COLUMNS, NEVER_ON_PHONE, PRIMARY_KEYS, recordIdOf, SNAPSHOT_TABLES } from './tables';

// Every statement takes the institution id in each `?`; children are deleted before the parents they hang from.
const AREAS = 'SELECT area_id FROM area WHERE institution_id = ?';
const SUBJECTS = `SELECT subject_id FROM subject WHERE area_id IN (${AREAS})`;
const DECKS = `SELECT deck_id FROM deck WHERE subject_id IN (${SUBJECTS})`;
const CARDS = `SELECT card_id FROM card WHERE deck_id IN (${DECKS})`;
const SECTIONS = `SELECT section_id FROM section WHERE subject_id IN (${SUBJECTS})`;
const ASSESSMENTS = `SELECT assessment_id FROM assessment WHERE deck_id IN (${DECKS}) OR section_id IN (${SECTIONS})`;
const ATTEMPTS = `SELECT attempt_id FROM attempt WHERE assessment_id IN (${ASSESSMENTS})`;
const PURGE = [
  `DELETE FROM answer WHERE attempt_id IN (${ATTEMPTS})`,
  `DELETE FROM plan_card WHERE plan_id IN (SELECT plan_id FROM reinforcement_plan WHERE attempt_id IN (${ATTEMPTS}))`,
  `DELETE FROM reinforcement_plan WHERE attempt_id IN (${ATTEMPTS})`,
  `DELETE FROM review_log WHERE attempt_id IN (${ATTEMPTS}) OR card_id IN (${CARDS})`,
  `DELETE FROM attempt WHERE assessment_id IN (${ASSESSMENTS})`,
  `DELETE FROM question WHERE assessment_id IN (${ASSESSMENTS})`,
  `DELETE FROM assessment_exception WHERE assessment_id IN (${ASSESSMENTS})`,
  `DELETE FROM assessment WHERE assessment_id IN (${ASSESSMENTS})`,
  `DELETE FROM card_state WHERE card_id IN (${CARDS})`,
  `DELETE FROM challenge_card WHERE card_id IN (${CARDS})`,
  `DELETE FROM error_report WHERE card_id IN (${CARDS})`,
  `DELETE FROM plan_card WHERE card_id IN (${CARDS})`,
  `DELETE FROM card_option WHERE card_id IN (${CARDS})`,
  `DELETE FROM card WHERE deck_id IN (${DECKS})`,
  `DELETE FROM deck_subscription WHERE deck_id IN (${DECKS})`,
  `DELETE FROM deck_endorsement WHERE deck_id IN (${DECKS}) OR section_id IN (${SECTIONS})`,
  `DELETE FROM deck_assignment WHERE deck_id IN (${DECKS}) OR section_id IN (${SECTIONS})`,
  `DELETE FROM deck WHERE subject_id IN (${SUBJECTS})`,
  `DELETE FROM unit_unlock WHERE unit_id IN (SELECT unit_id FROM unit WHERE subject_id IN (${SUBJECTS}))`,
  `DELETE FROM enrollment WHERE section_id IN (${SECTIONS})`,
  `DELETE FROM section WHERE subject_id IN (${SUBJECTS})`,
  `DELETE FROM unit WHERE subject_id IN (${SUBJECTS})`,
  `DELETE FROM subject WHERE area_id IN (${AREAS})`,
  'DELETE FROM academic_term WHERE institution_id = ?',
  'DELETE FROM membership WHERE institution_id = ?',
  'DELETE FROM area WHERE institution_id = ?',
  'DELETE FROM institution WHERE institution_id = ?',
];

async function purgeInstitution(db: SyncDatabase, institutionId: number) {
  for (const sql of PURGE) {
    const count = sql.split('?').length - 1;
    await db.runAsync(sql, Array(count).fill(institutionId));
  }
}

const changesText = (n: number) => (n === 1 ? '1 cambio sin enviar' : `${n} cambios sin enviar`);

export const notices = {
  suspended: (name: string, discarded: number) =>
    `${name} está suspendida: puedes consultar sus datos, pero no hacer cambios.` +
    (discarded ? ` Descartamos ${changesText(discarded)}.` : ''),
  removed: (name: string, discarded: number) =>
    `Ya no perteneces a ${name}. Borramos sus datos de este teléfono` +
    (discarded ? ` y descartamos ${changesText(discarded)}.` : '.'),
};

async function upsert(db: SyncDatabase, table: string, row: SyncRow) {
  const columns = await tableColumns(db, table);
  const keys = PRIMARY_KEYS[table];
  const names = Object.keys(row).filter((c) => columns.has(c));
  const keep = LOCAL_COLUMNS[table] ?? [];
  const updates = names.filter((c) => !keys.includes(c) && !keep.includes(c)).map((c) => `${c} = excluded.${c}`);
  await db.runAsync(
    `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})
     ON CONFLICT(${keys.join(', ')}) DO ${updates.length ? `UPDATE SET ${updates.join(', ')}` : 'NOTHING'}`,
    names.map((c) => toBindValue(row[c])),
  );
}

/** Deletes local rows of a snapshot table that the server no longer sends. */
async function dropMissing(db: SyncDatabase, table: string, rows: SyncRow[]) {
  const keys = PRIMARY_KEYS[table];
  const keep = new Set(rows.map((r) => recordIdOf(table, r)));
  const local = await db.getAllAsync<SyncRow>(`SELECT ${keys.join(', ')} FROM ${table}`, []);
  for (const row of local) {
    if (keep.has(recordIdOf(table, row))) continue;
    await db.runAsync(
      `DELETE FROM ${table} WHERE ${keys.map((k) => `${k} = ?`).join(' AND ')}`,
      keys.map((k) => toBindValue(row[k])),
    );
  }
}

type PendingRow = { change_id: number; table_name: string; record_id: string; payload_json: string };

export async function applyPull(db: SyncDatabase, pull: PullResponse): Promise<{ received: number; notices: string[] }> {
  const tables = pull.tables ?? {};
  const before = new Map(
    (await db.getAllAsync<{ institution_id: number; name: string; status: string }>(
      'SELECT institution_id, name, status FROM institution', [],
    )).map((i) => [i.institution_id, i]),
  );

  // Removed: some membership came back removed and none is still active in that institution.
  const memberships = (tables.membership ?? []) as { institution_id: number; status: string }[];
  const removed = new Set(
    memberships
      .filter((m) => m.status === 'removed')
      .map((m) => m.institution_id)
      .filter((id) => !memberships.some((m) => m.institution_id === id && m.status === 'active')),
  );
  const suspended = ((tables.institution ?? []) as { institution_id: number; name: string; status: string }[]).filter(
    (i) => i.status === 'suspended',
  );
  const affected = new Set([...removed, ...suspended.map((i) => i.institution_id)]);

  return withForeignKeysOff(db, async () => {
    // Pending changes of removed or suspended institutions are discarded (mapped before their data goes).
    const discarded = new Map<number, number>();
    if (affected.size) {
      const pending = await db.getAllAsync<PendingRow>('SELECT change_id, table_name, record_id, payload_json FROM pending_change', []);
      for (const p of pending) {
        const inst = await institutionOfChange(db, p.table_name, p.record_id, JSON.parse(p.payload_json));
        if (inst === null || !affected.has(inst)) continue;
        await db.runAsync('DELETE FROM pending_change WHERE change_id = ?', [p.change_id]);
        discarded.set(inst, (discarded.get(inst) ?? 0) + 1);
      }
    }
    const result: string[] = [];
    for (const id of removed) {
      await purgeInstitution(db, id);
      const local = before.get(id);
      if (local) result.push(notices.removed(local.name, discarded.get(id) ?? 0));
    }
    for (const inst of suspended) {
      if (before.get(inst.institution_id)?.status !== 'suspended') {
        result.push(notices.suspended(inst.name, discarded.get(inst.institution_id) ?? 0));
      }
    }

    // Upload tables the server also returns are merged, except records the phone still has to send.
    const stillPending = new Set(
      (await db.getAllAsync<{ table_name: string; record_id: string }>('SELECT table_name, record_id FROM pending_change', [])).map(
        (p) => `${p.table_name}|${p.record_id}`,
      ),
    );
    let received = 0;
    for (const [table, rows] of Object.entries(tables)) {
      if (!PRIMARY_KEYS[table] || (NEVER_ON_PHONE as readonly string[]).includes(table)) continue;
      received += rows.length;
      for (const row of rows) {
        if (stillPending.has(`${table}|${recordIdOf(table, row)}`)) continue;
        // The removed membership itself is not kept either: nothing of that institution stays on the phone.
        if (removed.has(row.institution_id as number)) continue;
        await upsert(db, table, row);
      }
      if (SNAPSHOT_TABLES.has(table)) await dropMissing(db, table, rows);
    }
    return { received, notices: result };
  });
}
