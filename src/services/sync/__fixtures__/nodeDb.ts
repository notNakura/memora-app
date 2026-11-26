// Test double: Node's built-in SQLite behind the SyncDatabase surface of expo-sqlite (tests only).
import { DatabaseSync } from 'node:sqlite';
import { migrateDbIfNeeded } from '../../../db/migrate';
import type { BindValue, SyncDatabase } from '../database';

const bind = (params: BindValue[]) => params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

export async function openNodeDb() {
  const raw = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (source: string) => {
      raw.exec(source);
    },
    runAsync: async (source: string, params: BindValue[] = []) => {
      const r = raw.prepare(source).run(...(bind(params) as never[]));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getFirstAsync: async <T,>(source: string, params: BindValue[] = []) =>
      ((raw.prepare(source).get(...(bind(params) as never[])) as T) ?? null),
    getAllAsync: async <T,>(source: string, params: BindValue[] = []) =>
      raw.prepare(source).all(...(bind(params) as never[])) as T[],
  };
  await migrateDbIfNeeded(db);
  const sync: SyncDatabase = db;
  const all = <T = Record<string, unknown>>(sql: string) => raw.prepare(sql).all() as T[];
  return { raw, db: sync, all };
}

/**
 * Local data of user 3 in two institutions: 1 (UNERG, card 10 in deck 1) and 2 (Academia, card 20 in deck 2).
 * Inserted with foreign keys off, as a pull would.
 */
export function seedTwoInstitutions(raw: DatabaseSync) {
  raw.exec(`
    PRAGMA foreign_keys = OFF;
    INSERT INTO app_user (user_id, email) VALUES (3, 'luis.perez@gmail.com');
    INSERT INTO institution (institution_id, name, type, join_code, status, created_by)
      VALUES (1, 'UNERG', 'university', 'UNERGK26', 'active', 1), (2, 'Academia Llanos', 'course', 'LLANS7K9', 'active', 2);
    INSERT INTO membership (membership_id, user_id, institution_id, role, status) VALUES (5, 3, 1, 'student', 'active'), (8, 3, 2, 'student', 'active');
    INSERT INTO area (area_id, institution_id, name) VALUES (1, 1, 'Sistemas'), (3, 2, 'Inglés');
    INSERT INTO subject (subject_id, area_id, code, name) VALUES (1, 1, 'SI3', 'SI III'), (2, 3, 'ING1', 'Inglés 1');
    INSERT INTO deck (deck_id, author_id, subject_id, name) VALUES (1, 2, 1, 'Modelo ER'), (2, 2, 2, 'Verbos');
    INSERT INTO card (card_id, deck_id, front, back) VALUES (10, 1, 'a', 'b'), (20, 2, 'c', 'd');
    INSERT INTO card_state (student_id, card_id, status) VALUES (3, 10, 'new'), (3, 20, 'new');
    PRAGMA foreign_keys = ON;
  `);
}
