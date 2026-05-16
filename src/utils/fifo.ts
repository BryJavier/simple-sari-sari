import type { UnpaidSale } from '@/db/types';

export interface FifoAllocation {
  saleId: number;
  amount: number;
}

export function allocateFIFO(
  sales: UnpaidSale[],
  paymentCentavos: number,
): FifoAllocation[] {
  const totalBalance = sales.reduce((sum, s) => sum + s.balance_centavos, 0);
  if (paymentCentavos > totalBalance) {
    throw new Error('overpayment');
  }

  const allocations: FifoAllocation[] = [];
  let remaining = paymentCentavos;

  for (const sale of sales) {
    if (remaining <= 0) break;
    const apply = Math.min(remaining, sale.balance_centavos);
    if (apply > 0) {
      allocations.push({ saleId: sale.id, amount: apply });
      remaining -= apply;
    }
  }

  return allocations;
}
