import type { Database } from '@/db/types';
import { v1Schema } from '@/db/migrationFiles/v1';
import { v2Migration } from '@/db/migrationFiles/v2';

export const CURRENT_SCHEMA_VERSION = 2;

const META_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`;

export async function getSchemaVersion(db: Database): Promise<number> {
  await db.exec(META_TABLE_SQL);
  const row = await db.get<{ value: string }>(
    "SELECT value FROM schema_meta WHERE key = 'version'",
  );
  return row ? Number(row.value) : 0;
}

async function setSchemaVersion(db: Database, version: number): Promise<void> {
  await db.run(
    "INSERT INTO schema_meta (key, value) VALUES ('version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [String(version)],
  );
}

export async function applyMigrations(db: Database): Promise<void> {
  const current = await getSchemaVersion(db);
  if (current >= CURRENT_SCHEMA_VERSION) return;

  if (current < 1) {
    await db.exec(v1Schema);
    await setSchemaVersion(db, 1);
  }

  if (current < 2) {
    await db.exec(v2Migration);
    await setSchemaVersion(db, 2);
  }
}

