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
