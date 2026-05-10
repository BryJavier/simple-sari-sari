import * as SQLite from 'expo-sqlite';
import type { Database, SqlParam } from './types';

class ExpoDatabase implements Database {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async exec(sql: string): Promise<void> {
    await this.db.execAsync(sql);
  }

  async run(sql: string, params: SqlParam[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    const result = await this.db.runAsync(sql, params);
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowId) };
  }

  async all<T = unknown>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    return (await this.db.getAllAsync<T>(sql, params)) as T[];
  }

  async get<T = unknown>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
    const row = await this.db.getFirstAsync<T>(sql, params);
    return row ?? undefined;
  }

  async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    let result!: T;
    await this.db.withTransactionAsync(async () => {
      result = await fn(this);
    });
    return result;
  }

  async close(): Promise<void> {
    await this.db.closeAsync();
  }
}

let openInstance: ExpoDatabase | null = null;

export async function openExpoDatabase(name = 'sari.db'): Promise<Database> {
  if (openInstance) return openInstance;
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  openInstance = new ExpoDatabase(db);
  return openInstance;
}
