import type { Database, Product } from '@/db/types';
import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import { createSale, voidSale, todaySalesSummary, listSalesByDate, getSaleWithItems } from '@/db/queries/sales';
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

  it('stores customer_phone when provided for utang sale', async () => {
    const saleId = await createSale(db, {
      items: [{ product, quantity: 1 }],
      paymentType: 'utang',
      customerName: 'Aling Nena',
      customerPhone: '09171234567',
    });
    const sale = await db.get<{ customer_phone: string | null }>(
      'SELECT customer_phone FROM sales WHERE id = ?',
      [saleId],
    );
    expect(sale?.customer_phone).toBe('09171234567');
  });

  it('stores NULL customer_phone when not provided', async () => {
    const saleId = await createSale(db, {
      items: [{ product, quantity: 1 }],
      paymentType: 'utang',
      customerName: 'Juan',
    });
    const sale = await db.get<{ customer_phone: string | null }>(
      'SELECT customer_phone FROM sales WHERE id = ?',
      [saleId],
    );
    expect(sale?.customer_phone).toBeNull();
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

  it('creates one sale_item row per distinct product', async () => {
    const { lastInsertRowid } = await db.run(
      'INSERT INTO products (name, price_centavos, cost_centavos, is_generated, created_at) VALUES (?, ?, ?, 0, ?)',
      ['Skyflakes', 1200, 800, todayISO()],
    );
    const product2 = (await db.get<Product>('SELECT * FROM products WHERE id = ?', [lastInsertRowid]))!;

    const saleId = await createSale(db, {
      items: [
        { product, quantity: 2 },
        { product: product2, quantity: 3 },
      ],
      paymentType: 'cash',
    });

    const items = await db.all<{ product_name: string; quantity: number }>(
      'SELECT product_name, quantity FROM sale_items WHERE sale_id = ? ORDER BY product_name ASC',
      [saleId],
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ product_name: 'Chippy', quantity: 2 });
    expect(items[1]).toEqual({ product_name: 'Skyflakes', quantity: 3 });
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

describe('listSalesByDate', () => {
  it('returns sales for the correct day with items attached', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 2 }], paymentType: 'cash' });
    const sales = await listSalesByDate(db, new Date());
    expect(sales).toHaveLength(1);
    expect(sales[0].id).toBe(saleId);
    expect(sales[0].items).toHaveLength(1);
    expect(sales[0].items[0].quantity).toBe(2);
    expect(sales[0].items[0].product_name).toBe('Chippy');
  });

  it('includes voided sales', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    await voidSale(db, saleId);
    const sales = await listSalesByDate(db, new Date());
    expect(sales).toHaveLength(1);
    expect(sales[0].voided_at).not.toBeNull();
  });

  it('excludes sales from other days', async () => {
    await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const sales = await listSalesByDate(db, yesterday);
    expect(sales).toHaveLength(0);
  });

  it('returns multiple sales newest-first', async () => {
    const id1 = await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    const id2 = await createSale(db, { items: [{ product, quantity: 2 }], paymentType: 'cash' });
    const sales = await listSalesByDate(db, new Date());
    expect(sales[0].id).toBe(id2);
    expect(sales[1].id).toBe(id1);
  });
});

describe('getSaleWithItems', () => {
  it('returns the sale with its items', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 3 }], paymentType: 'utang', customerName: 'Juan' });
    const sale = await getSaleWithItems(db, saleId);
    expect(sale).not.toBeNull();
    expect(sale!.id).toBe(saleId);
    expect(sale!.customer_name).toBe('Juan');
    expect(sale!.items).toHaveLength(1);
    expect(sale!.items[0].quantity).toBe(3);
  });

  it('returns null for an unknown id', async () => {
    const sale = await getSaleWithItems(db, 99999);
    expect(sale).toBeNull();
  });
});
