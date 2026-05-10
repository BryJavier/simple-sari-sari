import BetterSqlite3, { type Database as Better } from 'better-sqlite3';
import type { Database, SqlParam } from './types';

class TestDatabase implements Database {
  constructor(private readonly db: Better) {}

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async run(sql: string, params: SqlParam[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    const result = this.db.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
  }

  async all<T = unknown>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async get<T = unknown>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    let resultPromise!: Promise<T>;
    this.db.transaction(() => {
      resultPromise = fn(this);
    })();
    return resultPromise;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export function openTestDatabase(): Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('foreign_keys = ON');
  return new TestDatabase(db);
}
