import { allocateFIFO } from '@/utils/fifo';
import type { UnpaidSale } from '@/db/types';

function sale(id: number, total: number, paid: number): UnpaidSale {
  return {
    id,
    total_centavos: total,
    created_at: '2026-05-16T10:00:00.000',
    paid_centavos: paid,
    balance_centavos: total - paid,
  };
}

describe('allocateFIFO', () => {
  it('applies payment to the oldest sale first', () => {
    const sales = [sale(1, 1000, 0), sale(2, 2000, 0)];
    const result = allocateFIFO(sales, 1000);
    expect(result).toEqual([{ saleId: 1, amount: 1000 }]);
  });

  it('spans across multiple sales when first is not enough', () => {
    const sales = [sale(1, 500, 0), sale(2, 1000, 0)];
    const result = allocateFIFO(sales, 1200);
    expect(result).toEqual([
      { saleId: 1, amount: 500 },
      { saleId: 2, amount: 700 },
    ]);
  });

  it('handles exact full payment across all sales', () => {
    const sales = [sale(1, 300, 0), sale(2, 700, 0)];
    const result = allocateFIFO(sales, 1000);
    expect(result).toEqual([
      { saleId: 1, amount: 300 },
      { saleId: 2, amount: 700 },
    ]);
  });

  it('respects partial payment already made', () => {
    const sales = [sale(1, 1000, 400)]; // balance = 600
    const result = allocateFIFO(sales, 600);
    expect(result).toEqual([{ saleId: 1, amount: 600 }]);
  });

  it('throws on overpayment', () => {
    const sales = [sale(1, 500, 0)];
    expect(() => allocateFIFO(sales, 600)).toThrow('overpayment');
  });

  it('returns empty array for zero payment on empty sales', () => {
    expect(allocateFIFO([], 0)).toEqual([]);
  });
});
