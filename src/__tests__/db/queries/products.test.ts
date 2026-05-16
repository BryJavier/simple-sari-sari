import type { Database, Product } from '@/db/types';
import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import {
  listActiveProducts,
  seedSampleProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  getProduct,
} from '@/db/queries/products';
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

describe('product mutations', () => {
  it('createProduct inserts and returns id', async () => {
    const id = await createProduct(db, { name: 'Test', price_centavos: 500 });
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
    const row = (await db.get('SELECT * FROM products WHERE id = ?', [id])) as Product;
    expect(row.name).toBe('Test');
    expect(row.price_centavos).toBe(500);
    expect(row.cost_centavos).toBeNull();
    expect(row.barcode).toBeNull();
  });

  it('createProduct stores cost and barcode when provided', async () => {
    const id = await createProduct(db, {
      name: 'Item',
      price_centavos: 1000,
      cost_centavos: 750,
      barcode: '1234567890128',
    });
    const row = (await db.get('SELECT * FROM products WHERE id = ?', [id])) as Product;
    expect(row.cost_centavos).toBe(750);
    expect(row.barcode).toBe('1234567890128');
  });

  it('updateProduct changes all fields', async () => {
    const id = await createProduct(db, { name: 'Old', price_centavos: 100 });
    await updateProduct(db, id, { name: 'New', price_centavos: 200, cost_centavos: 150, barcode: 'XYZ' });
    const row = (await db.get('SELECT * FROM products WHERE id = ?', [id])) as Product;
    expect(row.name).toBe('New');
    expect(row.price_centavos).toBe(200);
    expect(row.cost_centavos).toBe(150);
    expect(row.barcode).toBe('XYZ');
  });

  it('archiveProduct sets archived_at', async () => {
    const id = await createProduct(db, { name: 'Temp', price_centavos: 50 });
    await archiveProduct(db, id);
    const row = (await db.get('SELECT * FROM products WHERE id = ?', [id])) as Product;
    expect(row.archived_at).not.toBeNull();
  });

  it('archiveProduct removes product from listActiveProducts', async () => {
    const id = await createProduct(db, { name: 'Gone', price_centavos: 50 });
    await archiveProduct(db, id);
    const active = await listActiveProducts(db);
    expect(active.find((p) => p.id === id)).toBeUndefined();
  });

  it('getProduct returns product', async () => {
    const id = await createProduct(db, { name: 'Found', price_centavos: 300 });
    const product = await getProduct(db, id);
    expect(product).toBeDefined();
    expect(product!.name).toBe('Found');
  });

  it('getProduct returns undefined for missing id', async () => {
    const product = await getProduct(db, 99999);
    expect(product).toBeUndefined();
  });

  it('updateProduct throws for non-existent id', async () => {
    await expect(updateProduct(db, 99999, { name: 'X', price_centavos: 100 })).rejects.toThrow('99999');
  });

  it('archiveProduct throws for non-existent id', async () => {
    await expect(archiveProduct(db, 99999)).rejects.toThrow('99999');
  });
});
