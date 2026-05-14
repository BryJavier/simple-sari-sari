import type { Database } from '@/db/types';
import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import { listActiveProducts, seedSampleProducts } from '@/db/queries/products';
import { todayISO } from '@/utils/date';

let db: Database;

beforeEach(async () => {
  db = openTestDatabase();
  await applyMigrations(db);
});

afterEach(async () => {
  await db.close();
});

describe('listActiveProducts', () => {
  it('returns empty array when no products exist', async () => {
    expect(await listActiveProducts(db)).toEqual([]);
  });

  it('returns non-archived products sorted by name ascending', async () => {
    const now = todayISO();
    await db.run(
      'INSERT INTO products (name, price_centavos, is_generated, created_at) VALUES (?, ?, 0, ?)',
      ['Zesto Juice', 2000, now],
    );
    await db.run(
      'INSERT INTO products (name, price_centavos, is_generated, created_at) VALUES (?, ?, 0, ?)',
      ['Adobo Chips', 1500, now],
    );
    await db.run(
      'INSERT INTO products (name, price_centavos, is_generated, created_at, archived_at) VALUES (?, ?, 0, ?, ?)',
      ['Archived Item', 1000, now, now],
    );

    const products = await listActiveProducts(db);
    expect(products).toHaveLength(2);
    expect(products[0].name).toBe('Adobo Chips');
    expect(products[1].name).toBe('Zesto Juice');
  });
});

describe('seedSampleProducts', () => {
  it('inserts sample products when table is empty', async () => {
    await seedSampleProducts(db);
    const products = await listActiveProducts(db);
    expect(products.length).toBeGreaterThan(0);
  });

  it('does not insert products when table already has data', async () => {
    await seedSampleProducts(db);
    const countAfterFirst = (await listActiveProducts(db)).length;
    await seedSampleProducts(db);
    const countAfterSecond = (await listActiveProducts(db)).length;
    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it('marks seeded products as is_generated = 1', async () => {
    await seedSampleProducts(db);
    const products = await listActiveProducts(db);
    expect(products.every((p) => p.is_generated === 1)).toBe(true);
  });
});
