import type { Database, UtangCustomer, UnpaidSale } from '@/db/types';
import { todayISO } from '@/utils/date';

export async function listOutstandingUtang(db: Database): Promise<UtangCustomer[]> {
  return db.all<UtangCustomer>(
    `SELECT
       s.customer_name,
       s.customer_phone,
       SUM(s.total_centavos) - COALESCE(SUM(up.amount_centavos), 0) AS total_owed_centavos
     FROM sales s
     LEFT JOIN utang_payments up ON up.sale_id = s.id
     WHERE s.payment_type = 'utang'
       AND s.voided_at IS NULL
     GROUP BY s.customer_name, s.customer_phone
     HAVING total_owed_centavos > 0
     ORDER BY s.customer_name ASC`,
  );
}

export async function getCustomerSales(
  db: Database,
  customerName: string,
): Promise<UnpaidSale[]> {
  return db.all<UnpaidSale>(
    `SELECT
       s.id,
       s.total_centavos,
       s.created_at,
       COALESCE(SUM(up.amount_centavos), 0) AS paid_centavos,
       s.total_centavos - COALESCE(SUM(up.amount_centavos), 0) AS balance_centavos
     FROM sales s
     LEFT JOIN utang_payments up ON up.sale_id = s.id
     WHERE s.customer_name = ?
       AND s.payment_type = 'utang'
       AND s.voided_at IS NULL
     GROUP BY s.id
     HAVING balance_centavos > 0
     ORDER BY s.created_at ASC`,
    [customerName],
  );
}

export async function recordUtangPayments(
  db: Database,
  payments: { saleId: number; amount: number }[],
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const p of payments) {
      await tx.run(
        'INSERT INTO utang_payments (sale_id, amount_centavos, paid_at) VALUES (?, ?, ?)',
        [p.saleId, p.amount, todayISO()],
      );
    }
  });
}
