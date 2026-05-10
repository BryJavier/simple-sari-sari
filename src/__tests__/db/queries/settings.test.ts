import type { Database } from '@/db/types';
import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import { getSetting, setSetting, getAllSettings } from '@/db/queries/settings';

let db: Database;

beforeEach(async () => {
  db = openTestDatabase();
  await applyMigrations(db);
});

afterEach(async () => {
  await db.close();
});

describe('settings queries', () => {
  it('returns undefined for a missing key', async () => {
    expect(await getSetting(db, 'storeName')).toBeUndefined();
  });

  it('persists a value via setSetting', async () => {
    await setSetting(db, 'storeName', "Aling Pinay's Store");
    expect(await getSetting(db, 'storeName')).toBe("Aling Pinay's Store");
  });

  it('updates an existing key', async () => {
    await setSetting(db, 'textSize', 'medium');
    await setSetting(db, 'textSize', 'large');
    expect(await getSetting(db, 'textSize')).toBe('large');
  });

  it('returns all settings as a map', async () => {
    await setSetting(db, 'textSize', 'large');
    await setSetting(db, 'density', 'spacious');
    const all = await getAllSettings(db);
    expect(all).toEqual({ textSize: 'large', density: 'spacious' });
  });

  it('returns an empty map when no settings exist', async () => {
    expect(await getAllSettings(db)).toEqual({});
  });
});
