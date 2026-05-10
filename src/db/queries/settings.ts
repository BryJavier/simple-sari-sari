import type { Database } from '@/db/types';

export async function getSetting(db: Database, key: string): Promise<string | undefined> {
  const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? undefined;
}

export async function setSetting(db: Database, key: string, value: string): Promise<void> {
  await db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function getAllSettings(db: Database): Promise<Record<string, string>> {
  const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}
