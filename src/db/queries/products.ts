import type { Database, Product } from '@/db/types';
import { todayISO } from '@/utils/date';

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
