import type { Database, Product } from '@/db/types';
import { todayISO } from '@/utils/date';

export interface CreateProductInput {
  name: string;
  price_centavos: number;
  cost_centavos?: number | null;
  barcode?: string | null;
}

export async function createProduct(db: Database, input: CreateProductInput): Promise<number> {
  const result = await db.run(
    "INSERT INTO products (name, price_centavos, cost_centavos, barcode, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
    [input.name, input.price_centavos, input.cost_centavos ?? null, input.barcode ?? null],
  );
  return Number(result.lastInsertRowid);
}

export interface UpdateProductInput {
  name: string;
  price_centavos: number;
  cost_centavos?: number | null;
  barcode?: string | null;
}

export async function updateProduct(
  db: Database,
  id: number,
  input: UpdateProductInput,
): Promise<void> {
  const { changes } = await db.run(
    'UPDATE products SET name = ?, price_centavos = ?, cost_centavos = ?, barcode = ? WHERE id = ?',
    [input.name, input.price_centavos, input.cost_centavos ?? null, input.barcode ?? null, id],
  );
  if (changes === 0) throw new Error(`Product ${id} not found`);
}

export async function archiveProduct(db: Database, id: number): Promise<void> {
  const { changes } = await db.run(
    "UPDATE products SET archived_at = datetime('now') WHERE id = ?",
    [id],
  );
  if (changes === 0) throw new Error(`Product ${id} not found`);
}

export async function getProductById(db: Database, id: number): Promise<Product | null> {
  const row = await db.get<Product>('SELECT * FROM products WHERE id = ?', [id]);
  return row ?? null;
}

export async function listActiveProducts(db: Database): Promise<Product[]> {
  return db.all<Product>(
    'SELECT * FROM products WHERE archived_at IS NULL ORDER BY name ASC',
  );
}

const SEED_PRODUCTS = [
  { name: 'Adobo Chips 25g', price_centavos: 1500, cost_centavos: 1000 },
  { name: 'C2 Apple Drink 230mL', price_centavos: 2000, cost_centavos: 1400 },
  { name: 'Chippy Corn Chips', price_centavos: 1500, cost_centavos: 1000 },
  { name: 'Kopiko Brown Coffee', price_centavos: 1000, cost_centavos: 600 },
  { name: 'Lucky Me Pancit Canton', price_centavos: 1300, cost_centavos: 900 },
  { name: 'Magic Sarap 8g', price_centavos: 500, cost_centavos: 300 },
  { name: 'Milo Sachet 22g', price_centavos: 1200, cost_centavos: 800 },
  { name: 'Nova Country Cheddar', price_centavos: 1500, cost_centavos: 1000 },
  { name: 'Safeguard Bar Soap 60g', price_centavos: 2800, cost_centavos: 1800 },
  { name: 'Skyflakes Crackers', price_centavos: 1200, cost_centavos: 800 },
  { name: 'Tide Powder 66g', price_centavos: 2500, cost_centavos: 1700 },
  { name: 'Zesto Apple Juice', price_centavos: 1000, cost_centavos: 700 },
];

export async function seedSampleProducts(db: Database): Promise<void> {
  const row = await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM products');
  if (row && row.count > 0) return;

  const now = todayISO();
  for (const p of SEED_PRODUCTS) {
    await db.run(
      'INSERT INTO products (name, price_centavos, cost_centavos, is_generated, created_at) VALUES (?, ?, ?, 1, ?)',
      [p.name, p.price_centavos, p.cost_centavos, now],
    );
  }
}
