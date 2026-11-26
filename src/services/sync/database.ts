// The part of expo-sqlite's SQLiteDatabase the sync engine uses (a Node SQLite double implements it in tests).
export type BindValue = string | number | null | boolean;

export interface SyncDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: BindValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(source: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: BindValue[]): Promise<T[]>;
}

/** SQLite has no booleans or objects: true/false become 1/0, objects JSON text, undefined NULL. */
export function toBindValue(value: unknown): BindValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string') return value;
  return JSON.stringify(value);
}

const columnCache = new WeakMap<SyncDatabase, Map<string, Set<string>>>();

/** Column names of a local table (cached per database). */
export async function tableColumns(db: SyncDatabase, table: string): Promise<Set<string>> {
  let perDb = columnCache.get(db);
  if (!perDb) {
    perDb = new Map();
    columnCache.set(db, perDb);
  }
  let columns = perDb.get(table);
  if (!columns) {
    const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`, []);
    columns = new Set(rows.map((r) => r.name));
    perDb.set(table, columns);
  }
  return columns;
}

/**
 * Runs `work` with foreign keys off, inside one transaction. The phone holds a partial replica (teachers,
 * authors and other users are not downloaded), so pulled rows cannot satisfy every foreign key.
 * PRAGMA foreign_keys cannot change inside a transaction, so this must not be called from one.
 */
export async function withForeignKeysOff<T>(db: SyncDatabase, work: () => Promise<T>): Promise<T> {
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.execAsync('BEGIN;');
    try {
      const result = await work();
      await db.execAsync('COMMIT;');
      return result;
    } catch (err) {
      await db.execAsync('ROLLBACK;');
      throw err;
    }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
