import type { Database, Product } from '@/db/types';
import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import { createSale, voidSale } from '@/db/queries/sales';
import { listOutstandingUtang, getCustomerSales, recordUtangPayments } from '@/db/queries/utang';
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

describe('listOutstandingUtang', () => {
  it('returns customer with outstanding balance', async () => {
    await createSale(db, {
      items: [{ product, quantity: 2 }],
      paymentType: 'utang',
      customerName: 'Aling Nena',
    });
    const result = await listOutstandingUtang(db);
    expect(result).toHaveLength(1);
    expect(result[0].customer_name).toBe('Aling Nena');
    expect(result[0].total_owed_centavos).toBe(3000);
  });

  it('excludes customer after full payment', async () => {
    const saleId = await createSale(db, {
      items: [{ product, quantity: 1 }],
      paymentType: 'utang',
      customerName: 'Juan',
    });
    await recordUtangPayments(db, [{ saleId, amount: 1500 }]);
    const result = await listOutstandingUtang(db);
    expect(result).toHaveLength(0);
  });

  it('reduces balance after partial payment', async () => {
    const saleId = await createSale(db, {
      items: [{ product, quantity: 2 }],
      paymentType: 'utang',
      customerName: 'Maria',
    });
    await recordUtangPayments(db, [{ saleId, amount: 1000 }]);
    const result = await listOutstandingUtang(db);
    expect(result[0].total_owed_centavos).toBe(2000);
  });

  it('does not include voided utang sales in balance', async () => {
    const saleId = await createSale(db, {
      items: [{ product, quantity: 1 }],
      paymentType: 'utang',
      customerName: 'Pedro',
    });
    await voidSale(db, saleId);
    const result = await listOutstandingUtang(db);
    expect(result).toHaveLength(0);
  });

  it('does not include cash sales', async () => {
    await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    const result = await listOutstandingUtang(db);
    expect(result).toHaveLength(0);
  });
});

describe('getCustomerSales', () => {
  it('returns unpaid sales for the customer sorted oldest-first', async () => {
    await createSale(db, {
      items: [{ product, quantity: 1 }],
      paymentType: 'utang',
      customerName: 'Aling Nena',
    });
    await createSale(db, {
      items: [{ product, quantity: 2 }],
      paymentType: 'utang',
      customerName: 'Aling Nena',
    });
    const sales = await getCustomerSales(db, 'Aling Nena');
    expect(sales).toHaveLength(2);
    expect(sales[0].total_centavos).toBe(1500);
    expect(sales[1].total_centavos).toBe(3000);
  });

  it('excludes sales of other customers', async () => {
    await createSale(db, {
      items: [{ product, quantity: 1 }],
      paymentType: 'utang',
      customerName: 'Other',
    });
    const sales = await getCustomerSales(db, 'Aling Nena');
    expect(sales).toHaveLength(0);
  });

  it('excludes fully paid sales', async () => {
    const saleId = await createSale(db, {
      items: [{ product, quantity: 1 }],
      paymentType: 'utang',
      customerName: 'Juan',
    });
    await recordUtangPayments(db, [{ saleId, amount: 1500 }]);
    const sales = await getCustomerSales(db, 'Juan');
    expect(sales).toHaveLength(0);
  });

  it('balance_centavos reflects partial payments', async () => {
    const saleId = await createSale(db, {
      items: [{ product, quantity: 2 }],
      paymentType: 'utang',
      customerName: 'Rosa',
    });
    await recordUtangPayments(db, [{ saleId, amount: 1000 }]);
    const sales = await getCustomerSales(db, 'Rosa');
    expect(sales[0].balance_centavos).toBe(2000);
    expect(sales[0].paid_centavos).toBe(1000);
  });
});

describe('recordUtangPayments', () => {
  it('inserts all payment rows atomically', async () => {
    const id1 = await createSale(db, {
      items: [{ product, quantity: 1 }],
      paymentType: 'utang',
      customerName: 'Juan',
    });
    const id2 = await createSale(db, {
      items: [{ product, quantity: 1 }],
      paymentType: 'utang',
      customerName: 'Juan',
    });
    await recordUtangPayments(db, [
      { saleId: id1, amount: 1500 },
      { saleId: id2, amount: 1500 },
    ]);
    const rows = await db.all<{ amount_centavos: number }>(
      'SELECT amount_centavos FROM utang_payments ORDER BY id',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].amount_centavos).toBe(1500);
    expect(rows[1].amount_centavos).toBe(1500);
  });
});
