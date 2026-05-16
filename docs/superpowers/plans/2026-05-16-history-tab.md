# History Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full History tab — date-filtered transaction list with void support, utang ledger with FIFO mark-paid, and all required DB queries and utilities.

**Architecture:** Two waves. Wave 1 (Tasks 1–4) builds the data layer; Tasks 2, 3, 4 can run in parallel after Task 1. Wave 2 (Tasks 5–10) builds the UI; Tasks 5–9 can run in parallel after all Wave 1 tasks complete; Task 10 (HistoryScreen) runs last.

**Tech Stack:** expo-sqlite (DB), Zustand (state), React Native Paper (UI), `@react-native-community/datetimepicker` (date picker), React Navigation native stack.

---

## Wave 1 — Data Layer

### Task 1: New DB types + sales query additions

**Files:**
- Modify: `src/db/types.ts`
- Modify: `src/db/queries/sales.ts`
- Modify: `src/__tests__/db/queries/sales.test.ts`

- [ ] **Step 1: Add new types to `src/db/types.ts`**

Append to the end of the existing file (after `TodaySummary`):

```ts
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
```

- [ ] **Step 2: Write failing tests for `listSalesByDate` and `getSaleWithItems`**

Add to `src/__tests__/db/queries/sales.test.ts` (below existing `describe` blocks). The imports at the top of the file already have `openTestDatabase`, `applyMigrations`, `createSale`, `todayISO` — add the two new functions to the `createSale` import line:

```ts
import { createSale, voidSale, todaySalesSummary, listSalesByDate, getSaleWithItems } from '@/db/queries/sales';
```

Then add:

```ts
describe('listSalesByDate', () => {
  it('returns sales for the correct day with items attached', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 2 }], paymentType: 'cash' });
    const sales = await listSalesByDate(db, new Date());
    expect(sales).toHaveLength(1);
    expect(sales[0].id).toBe(saleId);
    expect(sales[0].items).toHaveLength(1);
    expect(sales[0].items[0].quantity).toBe(2);
    expect(sales[0].items[0].product_name).toBe('Chippy');
  });

  it('includes voided sales', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    await voidSale(db, saleId);
    const sales = await listSalesByDate(db, new Date());
    expect(sales).toHaveLength(1);
    expect(sales[0].voided_at).not.toBeNull();
  });

  it('excludes sales from other days', async () => {
    await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const sales = await listSalesByDate(db, yesterday);
    expect(sales).toHaveLength(0);
  });

  it('returns multiple sales newest-first', async () => {
    const id1 = await createSale(db, { items: [{ product, quantity: 1 }], paymentType: 'cash' });
    const id2 = await createSale(db, { items: [{ product, quantity: 2 }], paymentType: 'cash' });
    const sales = await listSalesByDate(db, new Date());
    expect(sales[0].id).toBe(id2);
    expect(sales[1].id).toBe(id1);
  });
});

describe('getSaleWithItems', () => {
  it('returns the sale with its items', async () => {
    const saleId = await createSale(db, { items: [{ product, quantity: 3 }], paymentType: 'utang', customerName: 'Juan' });
    const sale = await getSaleWithItems(db, saleId);
    expect(sale).not.toBeNull();
    expect(sale!.id).toBe(saleId);
    expect(sale!.customer_name).toBe('Juan');
    expect(sale!.items).toHaveLength(1);
    expect(sale!.items[0].quantity).toBe(3);
  });

  it('returns null for an unknown id', async () => {
    const sale = await getSaleWithItems(db, 99999);
    expect(sale).toBeNull();
  });
});
```

- [ ] **Step 3: Run the new tests to verify they fail**

```
npx jest src/__tests__/db/queries/sales.test.ts --testNamePattern="listSalesByDate|getSaleWithItems" -t "listSalesByDate|getSaleWithItems"
```

Expected: FAIL — `listSalesByDate is not a function` / `getSaleWithItems is not a function`.

- [ ] **Step 4: Implement `listSalesByDate` and `getSaleWithItems` in `src/db/queries/sales.ts`**

Add to the top imports:
```ts
import type { Database, Product, TodaySummary, SaleWithItems, SaleItem } from '@/db/types';
```

Then append the two functions at the end of the file:

```ts
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
     ORDER BY s.created_at DESC, si.id ASC`,
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
```

- [ ] **Step 5: Run the tests to verify they pass**

```
npx jest src/__tests__/db/queries/sales.test.ts
```

Expected: all tests PASS (including the pre-existing ones).

- [ ] **Step 6: Commit**

```bash
git add src/db/types.ts src/db/queries/sales.ts src/__tests__/db/queries/sales.test.ts
git commit -m "feat(history): add SaleWithItems types and listSalesByDate/getSaleWithItems queries"
```

---

### Task 2: FIFO utility
*Can run in parallel with Task 3 and Task 4 after Task 1 is merged.*

**Files:**
- Create: `src/utils/fifo.ts`
- Create: `src/__tests__/utils/fifo.test.ts`

- [ ] **Step 1: Create the test file `src/__tests__/utils/fifo.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx jest src/__tests__/utils/fifo.test.ts
```

Expected: FAIL — `Cannot find module '@/utils/fifo'`.

- [ ] **Step 3: Create `src/utils/fifo.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```
npx jest src/__tests__/utils/fifo.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/fifo.ts src/__tests__/utils/fifo.test.ts
git commit -m "feat(history): add allocateFIFO utility"
```

---

### Task 3: Utang DB queries
*Can run in parallel with Task 2 and Task 4 after Task 1 is merged.*

**Files:**
- Create: `src/db/queries/utang.ts`
- Create: `src/__tests__/db/queries/utang.test.ts`

- [ ] **Step 1: Create the test file `src/__tests__/db/queries/utang.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```
npx jest src/__tests__/db/queries/utang.test.ts
```

Expected: FAIL — `Cannot find module '@/db/queries/utang'`.

- [ ] **Step 3: Create `src/db/queries/utang.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```
npx jest src/__tests__/db/queries/utang.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/queries/utang.ts src/__tests__/db/queries/utang.test.ts
git commit -m "feat(history): add utang DB queries — listOutstandingUtang, getCustomerSales, recordUtangPayments"
```

---

### Task 4: Navigation setup + install date picker
*Can run in parallel with Tasks 2 and 3 after Task 1 is merged.*

**Files:**
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/RootStack.tsx`

- [ ] **Step 1: Install `@react-native-community/datetimepicker`**

```bash
npx expo install @react-native-community/datetimepicker
```

Expected: package added to `package.json` and `package-lock.json`.

- [ ] **Step 2: Add `ReceiptDetail` route to `src/navigation/types.ts`**

Replace the `RootStackParamList` type:

```ts
export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  DisplaySettings: undefined;
  ReceiptDetail: { saleId: number };
};
```

Leave all other types in the file unchanged.

- [ ] **Step 3: Register `ReceiptDetailScreen` in `src/navigation/RootStack.tsx`**

Replace the entire file content:

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { DisplaySettingsScreen } from '@/screens/settings/DisplaySettingsScreen';
import { ReceiptDetailScreen } from '@/screens/history/ReceiptDetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Settings' }}
      />
      <Stack.Screen
        name="DisplaySettings"
        component={DisplaySettingsScreen}
        options={{ headerShown: true, title: 'Display' }}
      />
      <Stack.Screen
        name="ReceiptDetail"
        component={ReceiptDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
```

Note: `ReceiptDetailScreen` doesn't exist yet. TypeScript will error on this until Task 7 creates the file. That's fine — this task just wires the navigation; the build only needs to succeed after all Wave 2 tasks complete.

- [ ] **Step 4: Commit**

```bash
git add src/navigation/types.ts src/navigation/RootStack.tsx package.json package-lock.json
git commit -m "feat(history): add ReceiptDetail route + install datetimepicker"
```

---

## Wave 2 — UI Components

*All of Tasks 5–9 can run in parallel once all Wave 1 tasks are merged. Task 10 (HistoryScreen) runs after Tasks 5–9.*

---

### Task 5: `VoidConfirmDialog`

**Files:**
- Create: `src/screens/history/VoidConfirmDialog.tsx`

No tests for this component (it's a thin dialog wrapper over `voidSale` which is already tested).

- [ ] **Step 1: Create `src/screens/history/VoidConfirmDialog.tsx`**

```tsx
import { useState } from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { useDatabase } from '@/db/DatabaseProvider';
import { voidSale } from '@/db/queries/sales';
import { palette } from '@/theme/palette';

interface VoidConfirmDialogProps {
  visible: boolean;
  saleId: number;
  onDismiss: () => void;
  onVoided: () => void;
}

export function VoidConfirmDialog({
  visible,
  saleId,
  onDismiss,
  onVoided,
}: VoidConfirmDialogProps) {
  const db = useDatabase();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await voidSale(db, saleId);
      onVoided();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Void this transaction?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            The sale will stay in History but be excluded from totals. This cannot be
            undone.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>
            Cancel
          </Button>
          <Button
            onPress={handleConfirm}
            loading={loading}
            disabled={loading}
            textColor={palette.danger}
          >
            Void
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/history/VoidConfirmDialog.tsx
git commit -m "feat(history): add VoidConfirmDialog"
```

---

### Task 6: `UtangLedger`
*Can run in parallel with Tasks 5, 7, 8, 9.*

**Files:**
- Create: `src/screens/history/UtangLedger.tsx`

- [ ] **Step 1: Create `src/screens/history/UtangLedger.tsx`**

```tsx
import { FlatList, View, StyleSheet } from 'react-native';
import { List, Text } from 'react-native-paper';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { UtangCustomer } from '@/db/types';

interface UtangLedgerProps {
  customers: UtangCustomer[];
  onSelectCustomer: (customer: UtangCustomer) => void;
}

export function UtangLedger({ customers, onSelectCustomer }: UtangLedgerProps) {
  if (customers.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No outstanding utang. Nice!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={customers}
      keyExtractor={(c) => c.customer_name}
      renderItem={({ item }) => (
        <List.Item
          title={item.customer_name}
          description={item.customer_phone ?? undefined}
          left={(p) => <List.Icon {...p} icon="account" />}
          right={() => (
            <Text variant="titleMedium" style={styles.owed}>
              {formatMoney(item.total_owed_centavos)}
            </Text>
          )}
          onPress={() => onSelectCustomer(item)}
          style={styles.row}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: palette.card },
  owed: { color: palette.utang, fontVariant: ['tabular-nums'], alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: palette.text3, textAlign: 'center' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/history/UtangLedger.tsx
git commit -m "feat(history): add UtangLedger component"
```

---

### Task 7: `TransactionRow`
*Can run in parallel with Tasks 5, 6, 8, 9.*

**Files:**
- Create: `src/screens/history/TransactionRow.tsx`

- [ ] **Step 1: Create `src/screens/history/TransactionRow.tsx`**

```tsx
import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Menu, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { SaleWithItems } from '@/db/types';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

interface TransactionRowProps {
  sale: SaleWithItems;
  onVoidRequest: (saleId: number) => void;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function TransactionRow({ sale, onVoidRequest }: TransactionRowProps) {
  const navigation = useNavigation<RootNav>();
  const [menuVisible, setMenuVisible] = useState(false);
  const isVoided = sale.voided_at !== null;

  function openReceipt() {
    setMenuVisible(false);
    navigation.push('ReceiptDetail', { saleId: sale.id });
  }

  function requestVoid() {
    setMenuVisible(false);
    onVoidRequest(sale.id);
  }

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <Pressable
          onPress={openReceipt}
          onLongPress={() => setMenuVisible(true)}
          style={[styles.row, isVoided && styles.rowVoided]}
          android_ripple={{ color: palette.borderLight }}
        >
          <Text variant="bodySmall" style={styles.time}>
            {formatTime(sale.created_at)}
          </Text>
          <View style={styles.middle}>
            <View style={[styles.badge, sale.payment_type === 'utang' ? styles.badgeUtang : styles.badgeCash]}>
              <Text variant="labelSmall" style={styles.badgeText}>
                {sale.payment_type === 'cash' ? 'Cash' : 'Utang'}
              </Text>
            </View>
            {sale.customer_name ? (
              <Text variant="bodySmall" style={styles.customer} numberOfLines={1}>
                {sale.customer_name}
              </Text>
            ) : null}
          </View>
          <View style={styles.right}>
            <Text
              variant="titleSmall"
              style={[styles.total, isVoided && styles.totalVoided]}
            >
              {formatMoney(sale.total_centavos)}
            </Text>
            {isVoided && (
              <Text variant="labelSmall" style={styles.voidedLabel}>
                Voided
              </Text>
            )}
          </View>
        </Pressable>
      }
    >
      <Menu.Item onPress={openReceipt} title="View receipt" leadingIcon="receipt" />
      <Divider />
      <Menu.Item
        onPress={requestVoid}
        title="Void this transaction"
        leadingIcon="cancel"
        disabled={isVoided}
        titleStyle={isVoided ? { color: palette.muted } : { color: palette.danger }}
      />
    </Menu>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
    gap: 12,
  },
  rowVoided: { opacity: 0.5 },
  time: { color: palette.text3, width: 60 },
  middle: { flex: 1, gap: 4 },
  badge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeCash: { backgroundColor: palette.softBg },
  badgeUtang: { backgroundColor: '#FFF3E0' },
  badgeText: { color: palette.text },
  customer: { color: palette.text3 },
  right: { alignItems: 'flex-end', gap: 2 },
  total: { color: palette.text, fontVariant: ['tabular-nums'] },
  totalVoided: { textDecorationLine: 'line-through', color: palette.text3 },
  voidedLabel: { color: palette.text3 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/history/TransactionRow.tsx
git commit -m "feat(history): add TransactionRow with long-press action menu"
```

---

### Task 8: `ReceiptDetailScreen`
*Can run in parallel with Tasks 5, 6, 7, 9.*

**Files:**
- Create: `src/screens/history/ReceiptDetailScreen.tsx`

- [ ] **Step 1: Create `src/screens/history/ReceiptDetailScreen.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, Card, Text, Divider, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { useDatabase } from '@/db/DatabaseProvider';
import { getSaleWithItems } from '@/db/queries/sales';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import { VoidConfirmDialog } from './VoidConfirmDialog';
import type { SaleWithItems, SaleItem } from '@/db/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ReceiptDetail'>;
type Route = RouteProp<RootStackParamList, 'ReceiptDetail'>;

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mo = months[d.getMonth()];
  const day = d.getDate();
  const yr = d.getFullYear();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${mo} ${day}, ${yr} · ${h12}:${m} ${ampm}`;
}

function ItemRow({ item }: { item: SaleItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <Text variant="bodyMedium">{item.product_name}</Text>
        <Text variant="bodySmall" style={styles.itemQty}>
          {item.quantity} × {formatMoney(item.unit_price_centavos)}
        </Text>
      </View>
      <Text variant="bodyMedium" style={styles.itemTotal}>
        {formatMoney(item.unit_price_centavos * item.quantity)}
      </Text>
    </View>
  );
}

export function ReceiptDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { saleId } = route.params;
  const db = useDatabase();

  const [sale, setSale] = useState<SaleWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [voidDialogVisible, setVoidDialogVisible] = useState(false);
  const [errorSnack, setErrorSnack] = useState('');

  useEffect(() => {
    getSaleWithItems(db, saleId)
      .then(setSale)
      .catch(() => setErrorSnack('Could not load receipt.'))
      .finally(() => setLoading(false));
  }, [db, saleId]);

  function handleVoided() {
    setVoidDialogVisible(false);
    navigation.goBack();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.center}>
        <Text variant="bodyMedium" style={{ color: palette.text3 }}>
          Could not load receipt.
        </Text>
      </View>
    );
  }

  const isVoided = sale.voided_at !== null;

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Receipt" />
        {!isVoided && (
          <Appbar.Action
            icon="cancel"
            onPress={() => setVoidDialogVisible(true)}
            accessibilityLabel="Void transaction"
          />
        )}
      </Appbar.Header>

      <FlatList
        data={sale.items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <Card style={styles.metaCard}>
            <Card.Content style={styles.metaContent}>
              {isVoided && (
                <View style={styles.voidedBanner}>
                  <Text variant="labelLarge" style={styles.voidedBannerText}>
                    VOIDED
                  </Text>
                </View>
              )}
              <Text variant="bodySmall" style={styles.metaLabel}>
                {formatDateTime(sale.created_at)}
              </Text>
              <Text variant="bodyMedium" style={styles.metaPayment}>
                {sale.payment_type === 'cash' ? 'Cash' : 'Utang'}
                {sale.customer_name ? ` · ${sale.customer_name}` : ''}
              </Text>
            </Card.Content>
            <Divider />
          </Card>
        }
        renderItem={({ item }) => <ItemRow item={item} />}
        ItemSeparatorComponent={() => <Divider style={{ marginHorizontal: 16 }} />}
        ListFooterComponent={
          <>
            <Divider />
            <View style={styles.totalRow}>
              <Text variant="titleMedium">Total</Text>
              <Text
                variant="titleMedium"
                style={[styles.totalAmount, isVoided && styles.voidedText]}
              >
                {formatMoney(sale.total_centavos)}
              </Text>
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      <VoidConfirmDialog
        visible={voidDialogVisible}
        saleId={sale.id}
        onDismiss={() => setVoidDialogVisible(false)}
        onVoided={handleVoided}
      />

      <Snackbar
        visible={!!errorSnack}
        onDismiss={() => setErrorSnack('')}
        duration={3000}
      >
        {errorSnack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaCard: { margin: 0, borderRadius: 0, backgroundColor: palette.card },
  metaContent: { gap: 4, paddingTop: 12, paddingBottom: 12 },
  metaLabel: { color: palette.text3 },
  metaPayment: { color: palette.text },
  voidedBanner: {
    backgroundColor: palette.danger,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  voidedBannerText: { color: '#fff' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: palette.card,
  },
  itemLeft: { flex: 1, gap: 2 },
  itemQty: { color: palette.text3 },
  itemTotal: { color: palette.text, fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: palette.card,
  },
  totalAmount: { fontVariant: ['tabular-nums'] },
  voidedText: { textDecorationLine: 'line-through', color: palette.text3 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/history/ReceiptDetailScreen.tsx
git commit -m "feat(history): add ReceiptDetailScreen"
```

---

### Task 9: `MarkPaidSheet`
*Can run in parallel with Tasks 5, 6, 7, 8.*

**Files:**
- Create: `src/screens/history/MarkPaidSheet.tsx`

- [ ] **Step 1: Create `src/screens/history/MarkPaidSheet.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Surface, Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useDatabase } from '@/db/DatabaseProvider';
import { getCustomerSales, recordUtangPayments } from '@/db/queries/utang';
import { allocateFIFO } from '@/utils/fifo';
import { formatMoney, formatMoneyEdit, parseMoney, isValidMoneyInput } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { UtangCustomer, UnpaidSale } from '@/db/types';

interface MarkPaidSheetProps {
  visible: boolean;
  customer: UtangCustomer | null;
  onDismiss: () => void;
  onPaid: () => void;
}

export function MarkPaidSheet({ visible, customer, onDismiss, onPaid }: MarkPaidSheetProps) {
  const db = useDatabase();
  const [amountText, setAmountText] = useState('');
  const [unpaidSales, setUnpaidSales] = useState<UnpaidSale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !customer) {
      setAmountText('');
      setUnpaidSales([]);
      return;
    }
    setLoadingSales(true);
    getCustomerSales(db, customer.customer_name)
      .then(setUnpaidSales)
      .finally(() => setLoadingSales(false));
  }, [visible, customer, db]);

  if (!customer) return null;

  const totalOwed = customer.total_owed_centavos;
  const enteredCentavos = (() => {
    try { return amountText ? parseMoney(amountText) : 0; } catch { return -1; }
  })();
  const isOverpayment = enteredCentavos > totalOwed;
  const canConfirm =
    !submitting &&
    !loadingSales &&
    enteredCentavos > 0 &&
    !isOverpayment &&
    isValidMoneyInput(amountText);

  async function handleConfirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      const allocations = allocateFIFO(unpaidSales, enteredCentavos);
      await recordUtangPayments(db, allocations);
      onPaid();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <Surface style={styles.surface} elevation={2}>
          <Text variant="titleLarge" style={styles.name}>
            {customer.customer_name}
          </Text>
          <Text variant="bodySmall" style={styles.owedLabel}>
            Outstanding balance
          </Text>
          <Text variant="headlineMedium" style={styles.owedAmount}>
            {formatMoney(totalOwed)}
          </Text>

          {loadingSales ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : (
            <>
              <Button
                mode="outlined"
                compact
                onPress={() => setAmountText(formatMoneyEdit(totalOwed))}
                style={styles.allButton}
              >
                {`All ${formatMoney(totalOwed)}`}
              </Button>

              <TextInput
                label="Amount paid (₱)"
                value={amountText}
                onChangeText={(t) => { if (isValidMoneyInput(t)) setAmountText(t); }}
                keyboardType="decimal-pad"
                mode="outlined"
                style={styles.input}
                error={isOverpayment}
              />

              {isOverpayment && (
                <Text variant="bodySmall" style={styles.error}>
                  {`Cannot pay more than ${formatMoney(totalOwed)} owed.`}
                </Text>
              )}

              <View style={styles.actions}>
                <Button onPress={onDismiss} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleConfirm}
                  loading={submitting}
                  disabled={!canConfirm}
                >
                  Confirm payment
                </Button>
              </View>
            </>
          )}
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  surface: { borderRadius: 16, padding: 24, gap: 8 },
  name: { color: palette.text },
  owedLabel: { color: palette.text3, marginTop: 4 },
  owedAmount: { color: palette.utang, fontVariant: ['tabular-nums'] },
  allButton: { alignSelf: 'flex-start', marginTop: 8 },
  input: { marginTop: 8, backgroundColor: palette.card },
  error: { color: palette.danger },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/history/MarkPaidSheet.tsx
git commit -m "feat(history): add MarkPaidSheet with FIFO payment allocation"
```

---

### Task 10: `HistoryScreen` (orchestrator)
*Run after Tasks 5–9 are all merged.*

**Files:**
- Modify: `src/screens/history/HistoryScreen.tsx`

- [ ] **Step 1: Replace `src/screens/history/HistoryScreen.tsx` with the full implementation**

```tsx
import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, Card, Chip, Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '@/db/DatabaseProvider';
import { listSalesByDate } from '@/db/queries/sales';
import { listOutstandingUtang } from '@/db/queries/utang';
import { formatMoney } from '@/utils/money';
import { formatDayLabel } from '@/utils/date';
import { palette } from '@/theme/palette';
import { SegmentedControl } from '@/screens/settings/SegmentedControl';
import { TransactionRow } from './TransactionRow';
import { UtangLedger } from './UtangLedger';
import { VoidConfirmDialog } from './VoidConfirmDialog';
import { MarkPaidSheet } from './MarkPaidSheet';
import type { SaleWithItems, UtangCustomer } from '@/db/types';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

type Segment = 'transactions' | 'utang';

const SEGMENT_OPTIONS = [
  { value: 'transactions' as const, label: 'Transactions' },
  { value: 'utang' as const, label: 'Utang' },
];

function SummaryCards({
  sales,
  selectedDate,
}: {
  sales: SaleWithItems[];
  selectedDate: Date;
}) {
  const nonVoided = sales.filter((s) => !s.voided_at);
  const totalCentavos = nonVoided.reduce((sum, s) => sum + s.total_centavos, 0);
  const profitCentavos = nonVoided.reduce((sum, s) => {
    return (
      sum +
      s.items.reduce((si, item) => {
        if (item.unit_cost_centavos === null) return si;
        return si + (item.unit_price_centavos - item.unit_cost_centavos) * item.quantity;
      }, 0)
    );
  }, 0);

  const label = formatDayLabel(selectedDate);
  const salesLabel = label === 'Today' ? "Today's Sales" : `Sales · ${label}`;
  const profitLabel = label === 'Today' ? "Today's Profit" : `Profit · ${label}`;

  return (
    <View style={cardStyles.row}>
      <Card style={cardStyles.card}>
        <Card.Content>
          <Text variant="labelSmall" style={cardStyles.cardLabel}>
            {salesLabel.toUpperCase()}
          </Text>
          <Text variant="headlineSmall" style={cardStyles.salesAmount}>
            {formatMoney(totalCentavos)}
          </Text>
        </Card.Content>
      </Card>
      <Card style={cardStyles.card}>
        <Card.Content>
          <Text variant="labelSmall" style={cardStyles.cardLabel}>
            {profitLabel.toUpperCase()}
          </Text>
          <Text variant="headlineSmall" style={cardStyles.profitAmount}>
            {formatMoney(profitCentavos)}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, padding: 16 },
  card: { flex: 1, backgroundColor: palette.card },
  cardLabel: {
    color: palette.accent,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  salesAmount: { color: palette.text2, fontVariant: ['tabular-nums'] },
  profitAmount: { color: palette.profit, fontVariant: ['tabular-nums'] },
});

export function HistoryScreen() {
  const navigation = useNavigation<RootNav>();
  const db = useDatabase();

  const [segment, setSegment] = useState<Segment>('transactions');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [utangCustomers, setUtangCustomers] = useState<UtangCustomer[]>([]);
  const [loading, setLoading] = useState(false);

  // Quick-pick sheet state
  const [quickPickVisible, setQuickPickVisible] = useState(false);
  // Native calendar picker state
  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);

  // Void dialog state
  const [voidSaleId, setVoidSaleId] = useState<number | null>(null);

  // Mark paid state
  const [selectedCustomer, setSelectedCustomer] = useState<UtangCustomer | null>(null);

  const loadData = useCallback(
    async (date: Date) => {
      setLoading(true);
      try {
        const [fetchedSales, fetchedUtang] = await Promise.all([
          listSalesByDate(db, date),
          listOutstandingUtang(db),
        ]);
        setSales(fetchedSales);
        setUtangCustomers(fetchedUtang);
      } finally {
        setLoading(false);
      }
    },
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      setSelectedDate(today);
      loadData(today);
    }, [loadData]),
  );

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    setQuickPickVisible(false);
    loadData(date);
  }

  function handleVoided() {
    setVoidSaleId(null);
    loadData(selectedDate);
  }

  function handlePaid() {
    setSelectedCustomer(null);
    listOutstandingUtang(db).then(setUtangCustomers).catch(() => {});
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sevenAgo = new Date(today);
  sevenAgo.setDate(today.getDate() - 7);

  const chipLabel = `${formatDayLabel(selectedDate)} ▾`;

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.Content title="History" />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        />
      </Appbar.Header>

      <View style={styles.segmentRow}>
        <SegmentedControl
          options={SEGMENT_OPTIONS}
          value={segment}
          onChange={setSegment}
        />
      </View>

      {segment === 'transactions' && (
        <>
          <SummaryCards sales={sales} selectedDate={selectedDate} />
          <View style={styles.chipRow}>
            <Chip
              icon="calendar"
              onPress={() => setQuickPickVisible(true)}
              style={styles.chip}
            >
              {chipLabel}
            </Chip>
          </View>
        </>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : segment === 'transactions' ? (
        sales.length === 0 ? (
          <View style={styles.center}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No sales recorded on this day.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sales}
            keyExtractor={(s) => String(s.id)}
            renderItem={({ item }) => (
              <TransactionRow
                sale={item}
                onVoidRequest={(id) => setVoidSaleId(id)}
              />
            )}
          />
        )
      ) : (
        <UtangLedger
          customers={utangCustomers}
          onSelectCustomer={setSelectedCustomer}
        />
      )}

      {/* Quick-pick date sheet */}
      {quickPickVisible && (
        <View style={styles.quickPickOverlay}>
          <View style={styles.quickPickSheet}>
            <Text variant="titleMedium" style={styles.quickPickTitle}>
              Select date
            </Text>
            <View style={styles.quickPickChips}>
              {[
                { label: 'Today', date: today },
                { label: 'Yesterday', date: yesterday },
                { label: '7 days ago', date: sevenAgo },
              ].map(({ label, date }) => (
                <Chip key={label} onPress={() => handleDateSelect(date)}>
                  {label}
                </Chip>
              ))}
            </View>
            <Chip
              icon="calendar-blank"
              onPress={() => {
                setQuickPickVisible(false);
                setCalendarPickerVisible(true);
              }}
              style={{ alignSelf: 'flex-start', marginTop: 8 }}
            >
              Pick a date…
            </Chip>
            <Chip
              onPress={() => setQuickPickVisible(false)}
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            >
              Cancel
            </Chip>
          </View>
        </View>
      )}

      {/* Native OS date picker (Android dialog) */}
      {calendarPickerVisible && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          maximumDate={today}
          onChange={(event, date) => {
            setCalendarPickerVisible(false);
            if (event.type === 'set' && date) {
              handleDateSelect(date);
            }
          }}
        />
      )}

      <VoidConfirmDialog
        visible={voidSaleId !== null}
        saleId={voidSaleId ?? 0}
        onDismiss={() => setVoidSaleId(null)}
        onVoided={handleVoided}
      />

      <MarkPaidSheet
        visible={selectedCustomer !== null}
        customer={selectedCustomer}
        onDismiss={() => setSelectedCustomer(null)}
        onPaid={handlePaid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  segmentRow: { paddingHorizontal: 16, paddingVertical: 12 },
  chipRow: { paddingHorizontal: 16, paddingBottom: 8 },
  chip: { alignSelf: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: palette.text3, textAlign: 'center' },
  quickPickOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  quickPickSheet: {
    backgroundColor: palette.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    gap: 8,
  },
  quickPickTitle: { color: palette.text, marginBottom: 4 },
  quickPickChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
```

- [ ] **Step 2: Run the full test suite to verify nothing is broken**

```
npx jest
```

Expected: all tests PASS (no new tests for HistoryScreen — it's composed from already-tested pieces).

- [ ] **Step 3: Commit**

```bash
git add src/screens/history/HistoryScreen.tsx
git commit -m "feat(history): implement full HistoryScreen — transactions, utang, date filter, void, mark paid"
```

---

## Final verification

- [ ] **Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Run full test suite one last time**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Final commit if any cleanup needed**

```bash
git add -p
git commit -m "chore(history): fix any lint/type issues from History tab implementation"
```
