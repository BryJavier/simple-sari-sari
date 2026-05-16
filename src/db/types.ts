export type SqlParam = string | number | null;

export interface Database {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<{ changes: number; lastInsertRowid: number }>;
  all<T = unknown>(sql: string, params?: SqlParam[]): Promise<T[]>;
  get<T = unknown>(sql: string, params?: SqlParam[]): Promise<T | undefined>;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface Product {
  id: number;
  name: string;
  price_centavos: number;
  cost_centavos: number | null;
  barcode: string | null;
  is_generated: number;
  created_at: string;
  archived_at: string | null;
}

export interface TodaySummary {
  salesCount: number;
  totalCentavos: number;
  profitCentavos: number;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  unit_price_centavos: number;
  unit_cost_centavos: number | null;
  quantity: number;
}

export interface SaleWithItems {
  id: number;
  total_centavos: number;
  payment_type: 'cash' | 'utang';
  customer_name: string | null;
  customer_phone: string | null;
  voided_at: string | null;
  created_at: string;
  items: SaleItem[];
}

export interface UtangCustomer {
  customer_name: string;
  customer_phone: string | null;
  total_owed_centavos: number;
}

export interface UnpaidSale {
  id: number;
  total_centavos: number;
  created_at: string;
  paid_centavos: number;
  balance_centavos: number;
}
