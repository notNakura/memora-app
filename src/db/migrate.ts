// Creates the local database from database/memora_sqlite.sql (see scripts/generate-assets.mjs).
// Uses PRAGMA user_version so the schema runs only once per device.
import { SQLITE_SCHEMA } from './schema.generated';

export const DATABASE_NAME = 'memora.db';
/**
 * 1: first schema (role table, role on app_user).
 * 2: multi-institution schema (roles live in membership). Version 1 only ever held development data,
 *    so it is dropped and created again instead of being converted.
 * 3: sync engine (docs/07_sincronizacion.md): pending_change.rejected_reason keeps the server's reason for a
 *    rejected change, sync_log.cursor keeps the server cursor of each successful pull.
 */
export const DATABASE_VERSION = 3;

/** Changes after the base schema, applied in order to reach DATABASE_VERSION (key = version reached). */
const UPGRADES: Record<number, string> = {
  3: `ALTER TABLE pending_change ADD COLUMN rejected_reason TEXT;
ALTER TABLE sync_log ADD COLUMN cursor TEXT;`,
};

/** Minimal surface shared by expo-sqlite's SQLiteDatabase and test doubles. */
export interface MigratableDatabase {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string): Promise<T | null>;
  getAllAsync<T>(source: string): Promise<T[]>;
}

async function dropAllTables(db: MigratableDatabase) {
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  // Foreign keys cannot be switched inside a transaction; turn them off so the drop order does not matter.
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  await db.execAsync(`BEGIN;\n${tables.map((t) => `DROP TABLE IF EXISTS "${t.name}";`).join('\n')}\nCOMMIT;`);
  await db.execAsync('PRAGMA foreign_keys = ON;');
}

export async function migrateDbIfNeeded(db: MigratableDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 1) await dropAllTables(db);

  // Version 2 is the first schema upgraded in place; older or empty databases start from the base schema.
  const inPlace = currentVersion >= 2;
  const steps = Object.keys(UPGRADES)
    .map(Number)
    .filter((v) => v > Math.max(currentVersion, 2) && v <= DATABASE_VERSION)
    .sort((a, b) => a - b)
    .map((v) => UPGRADES[v]);
  // The version is saved inside the same transaction, so an app closed mid-upgrade never leaves new
  // columns with the old version (which made every later start fail with "duplicate column").
  await db.execAsync(
    `BEGIN;\n${inPlace ? '' : SQLITE_SCHEMA}\n${steps.join('\n')}\nPRAGMA user_version = ${DATABASE_VERSION};\nCOMMIT;`,
  );
}
