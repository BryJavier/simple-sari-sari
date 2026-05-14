import type { Database, Product } from '@/db/types';
import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import { createSale, voidSale, todaySalesSummary } from '@/db/queries/sales';
import { todayISO } from '@/utils/date';

let db: Database;
let product: Product;

beforeEach(async () => {
  db = openTestDatabase();
  await applyMigrations(db);
  const { lastInsertRowid } = await db.run(
    'INSERT INTO products (name, price_centavos, cost_centavos, is_generated, created_at) VALUES (?, ?, ?, 0, ?)',
    ['Chippy', 1500, 1000, todayISO()],
  );
  product = (await db.get<Product>('SELECT * FROM products WHERE id = ?', [lastInsertRowid]))!;
});

afterEach(async () => {
  await db.close();
});

describe('createSale', () => {
  it('returns a positive sale id', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    expect(saleId).toBeGreaterThan(0);
  });

  it('stores total_centavos as price × quantity summed across items', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 3 }], paymentType: 'cash' });
    const sale = await db.get<{ total_centavos: number }>('SELECT total_centavos FROM sales WHERE id = ?', [saleId]);
    expect(sale?.total_centavos).toBe(1500 * 3);
  });

  it('stores payment_type', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'utang', customerName: 'Juan' });
    const sale = await db.get<{ payment_type: string }>('SELECT payment_type FROM sales WHERE id = ?', [saleId]);
    expect(sale?.payment_type).toBe('utang');
  });

  it('stores customer_name for utang sales', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'utang', customerName: 'Aling Nena' });
    const sale = await db.get<{ customer_name: string }>('SELECT customer_name FROM sales WHERE id = ?', [saleId]);
    expect(sale?.customer_name).toBe('Aling Nena');
  });

  it('creates one sale_item per cart item', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 2 }], paymentType: 'cash' });
    const items = await db.all<{ quantity: number; product_name: string; unit_price_centavos: number }>(
      'SELECT * FROM sale_items WHERE sale_id = ?',
      [saleId],
    );
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].product_name).toBe('Chippy');
    expect(items[0].unit_price_centavos).toBe(1500);
  });
});

describe('voidSale', () => {
  it('sets voided_at to a non-null value', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    await voidSale(db, saleId);
    const sale = await db.get<{ voided_at: string | null }>('SELECT voided_at FROM sales WHERE id = ?', [saleId]);
    expect(sale?.voided_at).not.toBeNull();
  });
});

describe('todaySalesSummary', () => {
  it('returns zeros when no sales exist', async () => {
    const summary = await todaySalesSummary(db);
    expect(summary).toEqual({ salesCount: 0, totalCentavos: 0, profitCentavos: 0 });
  });

  it('counts only non-voided sales', async () => {
    const saleId1 = await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    await voidSale(db, saleId1);
    const summary = await todaySalesSummary(db);
    expect(summary.salesCount).toBe(1);
  });

  it('sums total_centavos of non-voided sales', async () => {
    await createSale(db, { items: [{ product, quantity: 2 }], paymentType: 'cash' });
    await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    const summary = await todaySalesSummary(db);
    expect(summary.totalCentavos).toBe(1500 * 3);
  });

  it('computes profit for items with cost data (price - cost) × qty', async () => {
    await createSale(db, { items: [{ product, quantity: 2 }], paymentType: 'cash' });
    const summary = await todaySalesSummary(db);
    expect(summary.profitCentavos).toBe((1500 - 1000) * 2);
  });

  it('counts null cost as zero profit contribution', async () => {
    const { lastInsertRowid } = await db.run(
      'INSERT INTO products (name, price_centavos, cost_centavos, is_generated, created_at) VALUES (?, ?, NULL, 0, ?)',
      ['No-cost item', 2000, todayISO()],
    );
    const noCostProduct = (await db.get<Product>('SELECT * FROM products WHERE id = ?', [lastInsertRowid]))!;
    await createSale(db, { items: [{ product: noCostProduct, quantity: 1 }], paymentType: 'cash' });
    const summary = await todaySalesSummary(db);
    expect(summary.profitCentavos).toBe(0);
  });
});
