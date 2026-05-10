import { openTestDatabase } from '@/db/testClient';
import { applyMigrations, getSchemaVersion, CURRENT_SCHEMA_VERSION } from '@/db/migrations';

describe('migrations', () => {
  it('starts a fresh database at version 0', async () => {
    const db = openTestDatabase();
    expect(await getSchemaVersion(db)).toBe(0);
    await db.close();
  });

  it('applies migrations and updates the schema version', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    expect(await getSchemaVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
    await db.close();
  });

  it('creates all five tables', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    const rows = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const names = rows.map((r) => r.name);
    ['products', 'sales', 'sale_items', 'utang_payments', 'settings'].forEach((t) =>
      expect(names).toContain(t),
    );
    await db.close();
  });

  it('is idempotent — running twice does not fail', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await applyMigrations(db);
    expect(await getSchemaVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
    await db.close();
  });

  it('enforces unique barcode', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await db.run(
      "INSERT INTO products (name, price_centavos, barcode, is_generated, created_at) VALUES ('A', 100, 'X1', 0, '2026-05-10')",
    );
    await expect(
      db.run(
        "INSERT INTO products (name, price_centavos, barcode, is_generated, created_at) VALUES ('B', 100, 'X1', 0, '2026-05-10')",
      ),
    ).rejects.toThrow();
    await db.close();
  });
});
