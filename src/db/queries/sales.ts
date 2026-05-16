import type { Database, Product, TodaySummary } from '@/db/types';
import { todayISO, dayBoundsLocalISO } from '@/utils/date';

interface CartItemInput {
  product: Product;
  quantity: number;
}

export async function createSale(
  db: Database,
  input: {
    items: CartItemInput[];
    paymentType: 'cash' | 'utang';
    customerName?: string;
    customerPhone?: string;
  },
): Promise<number> {
  const totalCentavos = input.items.reduce(
    (sum, item) => sum + item.product.price_centavos * item.quantity,
    0,
  );

  return db.transaction(async (tx) => {
    const { lastInsertRowid: saleId } = await tx.run(
      'INSERT INTO sales (total_centavos, payment_type, customer_name, customer_phone, created_at) VALUES (?, ?, ?, ?, ?)',
      [totalCentavos, input.paymentType, input.customerName ?? null, input.customerPhone ?? null, todayISO()],
    );

    for (const item of input.items) {
      await tx.run(
        'INSERT INTO sale_items (sale_id, product_id, product_name, unit_price_centavos, unit_cost_centavos, quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [
          saleId,
          item.product.id,
          item.product.name,
          item.product.price_centavos,
          item.product.cost_centavos,
          item.quantity,
        ],
      );
    }

    return saleId;
  });
}

export async function voidSale(db: Database, saleId: number): Promise<void> {
  await db.run('UPDATE sales SET voided_at = ? WHERE id = ?', [todayISO(), saleId]);
}

export async function todaySalesSummary(db: Database): Promise<TodaySummary> {
  const { start, end } = dayBoundsLocalISO(new Date());

  const salesRow = await db.get<{ sales_count: number; total_centavos: number }>(
    `SELECT COUNT(*) AS sales_count, COALESCE(SUM(total_centavos), 0) AS total_centavos
     FROM sales WHERE created_at >= ? AND created_at <= ? AND voided_at IS NULL`,
    [start, end],
  );

  const profitRow = await db.get<{ profit_centavos: number }>(
    `SELECT COALESCE(SUM(
       si.quantity * (si.unit_price_centavos - COALESCE(si.unit_cost_centavos, si.unit_price_centavos))
     ), 0) AS profit_centavos
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     WHERE s.created_at >= ? AND s.created_at <= ? AND s.voided_at IS NULL`,
    [start, end],
  );

  return {
    salesCount: salesRow?.sales_count ?? 0,
    totalCentavos: salesRow?.total_centavos ?? 0,
    profitCentavos: profitRow?.profit_centavos ?? 0,
  };
}
