import type { Database, Product, TodaySummary, SaleWithItems, SaleItem } from '@/db/types';
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

type SaleJoinRow = {
  sale_id: number;
  total_centavos: number;
  payment_type: 'cash' | 'utang';
  customer_name: string | null;
  customer_phone: string | null;
  voided_at: string | null;
  sale_created_at: string;
  item_id: number | null;
  product_id: number | null;
  product_name: string | null;
  unit_price_centavos: number | null;
  unit_cost_centavos: number | null;
  quantity: number | null;
};

function rowsToSales(rows: SaleJoinRow[]): SaleWithItems[] {
  const map = new Map<number, SaleWithItems>();
  for (const row of rows) {
    if (!map.has(row.sale_id)) {
      map.set(row.sale_id, {
        id: row.sale_id,
        total_centavos: row.total_centavos,
        payment_type: row.payment_type,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        voided_at: row.voided_at,
        created_at: row.sale_created_at,
        items: [],
      });
    }
    if (row.item_id !== null) {
      map.get(row.sale_id)!.items.push({
        id: row.item_id,
        sale_id: row.sale_id,
        product_id: row.product_id!,
        product_name: row.product_name!,
        unit_price_centavos: row.unit_price_centavos!,
        unit_cost_centavos: row.unit_cost_centavos,
        quantity: row.quantity!,
      });
    }
  }
  return Array.from(map.values());
}

const SALE_JOIN_SQL = `
  SELECT
    s.id            AS sale_id,
    s.total_centavos,
    s.payment_type,
    s.customer_name,
    s.customer_phone,
    s.voided_at,
    s.created_at    AS sale_created_at,
    si.id           AS item_id,
    si.product_id,
    si.product_name,
    si.unit_price_centavos,
    si.unit_cost_centavos,
    si.quantity
  FROM sales s
  LEFT JOIN sale_items si ON si.sale_id = s.id
`;

export async function listSalesByDate(
  db: Database,
  date: Date,
): Promise<SaleWithItems[]> {
  const { start, end } = dayBoundsLocalISO(date);
  const rows = await db.all<SaleJoinRow>(
    `${SALE_JOIN_SQL}
     WHERE s.created_at >= ? AND s.created_at <= ?
     ORDER BY s.created_at DESC, s.id DESC, si.id ASC`,
    [start, end],
  );
  return rowsToSales(rows);
}

export async function getSaleWithItems(
  db: Database,
  saleId: number,
): Promise<SaleWithItems | null> {
  const rows = await db.all<SaleJoinRow>(
    `${SALE_JOIN_SQL}
     WHERE s.id = ?
     ORDER BY si.id ASC`,
    [saleId],
  );
  if (rows.length === 0) return null;
  return rowsToSales(rows)[0];
}
