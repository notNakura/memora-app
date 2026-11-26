/**
 * @jest-environment node
 */
// Runs the real schema against Node's built-in SQLite to prove the script is valid for SQLite.
import { DatabaseSync } from 'node:sqlite';
import { DATABASE_VERSION, migrateDbIfNeeded, type MigratableDatabase } from '../migrate';

function openTestDb() {
  const raw = new DatabaseSync(':memory:');
  const db: MigratableDatabase = {
    execAsync: async (source) => {
      raw.exec(source);
    },
    getFirstAsync: async <T,>(source: string) => (raw.prepare(source).get() as T) ?? null,
    getAllAsync: async <T,>(source: string) => raw.prepare(source).all() as T[],
  };
  return { raw, db };
}

const tableNames = (raw: DatabaseSync) =>
  (raw
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[]).map((r) => r.name);

const insertUser = "INSERT INTO app_user (email) VALUES ('luis.perez@gmail.com')";

describe('migrateDbIfNeeded', () => {
  it('creates every table of database/memora_sqlite.sql, without a role table', async () => {
    const { raw, db } = openTestDb();
    await migrateDbIfNeeded(db);

    const tables = tableNames(raw);
    expect(tables).toHaveLength(34);
    expect(tables).toEqual(expect.arrayContaining(['app_user', 'membership', 'card_state', 'pending_change', 'sync_log']));
    expect(tables).not.toContain('role');
    expect(DATABASE_VERSION).toBe(3);
    expect(raw.prepare('PRAGMA user_version').get()).toEqual({ user_version: 3 });
  });

  it('adds the sync columns: pending_change.rejected_reason and sync_log.cursor', async () => {
    const { raw, db } = openTestDb();
    await migrateDbIfNeeded(db);
    const columns = (table: string) =>
      (raw.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
    expect(columns('pending_change')).toContain('rejected_reason');
    expect(columns('sync_log')).toContain('cursor');
  });

  it('upgrades a version-2 database in place, keeping its data', async () => {
    const { raw, db } = openTestDb();
    await migrateDbIfNeeded(db);
    // Simulate a phone still on version 2: no sync columns yet.
    raw.exec('ALTER TABLE pending_change DROP COLUMN rejected_reason; ALTER TABLE sync_log DROP COLUMN cursor;');
    raw.exec('PRAGMA user_version = 2');
    raw.exec(insertUser);

    await migrateDbIfNeeded(db);

    expect(raw.prepare('SELECT COUNT(*) AS n FROM app_user').get()).toEqual({ n: 1 });
    expect(raw.prepare('PRAGMA user_version').get()).toEqual({ user_version: 3 });
    raw.exec("INSERT INTO pending_change (table_name, record_id, operation, payload_json, rejected_reason) VALUES ('streak', '1', 'update', '{}', 'x')");
  });

  it('can resume after the app dies right after the upgrade commits (version saved in the same transaction)', async () => {
    const { raw, db } = openTestDb();
    await migrateDbIfNeeded(db);
    raw.exec('ALTER TABLE pending_change DROP COLUMN rejected_reason; ALTER TABLE sync_log DROP COLUMN cursor;');
    raw.exec('PRAGMA user_version = 2');

    // The app dies before any statement that runs after the upgrade's COMMIT.
    let committed = false;
    const dying: MigratableDatabase = {
      ...db,
      execAsync: async (source) => {
        if (committed) throw new Error('app closed');
        raw.exec(source);
        if (/COMMIT;\s*$/.test(source)) committed = true;
      },
    };
    await migrateDbIfNeeded(dying).catch(() => undefined);

    await expect(migrateDbIfNeeded(db)).resolves.toBeUndefined();
    expect(raw.prepare('PRAGMA user_version').get()).toEqual({ user_version: DATABASE_VERSION });
  });

  it('is idempotent: a second run keeps existing data and does not fail', async () => {
    const { raw, db } = openTestDb();
    await migrateDbIfNeeded(db);
    raw.exec(insertUser);

    await migrateDbIfNeeded(db);

    expect(raw.prepare('SELECT COUNT(*) AS n FROM app_user').get()).toEqual({ n: 1 });
  });

  it('enforces foreign keys after migrating', async () => {
    const { raw, db } = openTestDb();
    await migrateDbIfNeeded(db);
    expect(() =>
      raw.exec("INSERT INTO membership (user_id, institution_id, role) VALUES (99, 99, 'student')"),
    ).toThrow(/FOREIGN KEY/);
  });

  it('replaces a version-1 database (old schema with the role table) with the new schema', async () => {
    const { raw, db } = openTestDb();
    raw.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE role (role_id INTEGER PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE app_user (user_id INTEGER PRIMARY KEY, role_id INT NOT NULL REFERENCES role(role_id), email TEXT);
      CREATE TABLE card_state (student_id INT REFERENCES app_user(user_id), card_id INT);
      INSERT INTO role VALUES (1, 'student');
      INSERT INTO app_user VALUES (1, 1, 'old@unerg.edu.ve');
      INSERT INTO card_state VALUES (1, 1);
      PRAGMA user_version = 1;
    `);

    await migrateDbIfNeeded(db);

    const tables = tableNames(raw);
    expect(tables).toHaveLength(34);
    expect(tables).not.toContain('role');
    expect(raw.prepare('SELECT COUNT(*) AS n FROM app_user').get()).toEqual({ n: 0 });
    raw.exec(insertUser); // new shape: no role_id, personal data optional
    expect(raw.prepare('PRAGMA user_version').get()).toEqual({ user_version: 3 });
    expect(raw.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
  });
});
