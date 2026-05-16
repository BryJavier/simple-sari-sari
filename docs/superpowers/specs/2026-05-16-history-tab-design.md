# History Tab — Design Spec

**Date:** 2026-05-16
**Status:** Approved
**Branch:** phase-5

---

## Overview

Implement the History tab, the last major unimplemented section of the master spec
(`2026-05-10-sari-sari-pos-design.md`). The tab exposes two segments — **Transactions**
(date-filtered sale history with void support) and **Utang** (outstanding customer credit
with mark-paid) — plus the gear icon that navigates to Settings.

`HistoryScreen.tsx` is currently a placeholder stub. Everything described here is new.

---

## Scope

### In scope

- History tab full implementation (all screens and modals)
- New DB queries: `listSalesByDate`, `getSaleWithItems`, `listOutstandingUtang`,
  `getCustomerSales`, `recordUtangPayments`
- New utility: `src/utils/fifo.ts` — pure FIFO allocator for utang payments
- New shared types in `src/db/types.ts`: `SaleWithItems`, `SaleItem`, `UtangCustomer`,
  `UnpaidSale`
- Navigation: `ReceiptDetail: { saleId: number }` route added to `RootStackParamList`
  and `RootStack.tsx`
- Install `@react-native-community/datetimepicker` via `expo install` (needed for the
  date picker modal; not currently in `package.json`)

### Out of scope

- Backup & Restore (separate phase)
- Store name editing (separate phase)
- Date-range aggregations (out of scope per master spec §12)
- Per-product analytics (out of scope per master spec §12)
- Showing `customer_phone` in History (field exists in DB; display deferred)

---

## Implementation strategy

**Two waves, subagent-driven:**

- **Wave 1** — data layer. Three independent subagents build and test all DB queries,
  the new `db/queries/utang.ts` file, and `utils/fifo.ts`. Wave 2 starts only after
  Wave 1 types are locked.
- **Wave 2** — UI. Six parallel subagents build the screen and component files against
  the stable data contracts from Wave 1.

---

## Wave 1 — Data layer

### 1A: `src/db/queries/sales.ts` additions

Two new query functions added to the existing file.

#### `listSalesByDate(db: Database, date: Date): Promise<SaleWithItems[]>`

Returns all sales (voided and non-voided) whose `created_at` falls within the local
calendar day of `date`, each with its `sale_items[]` attached.

```ts
// Uses dayBoundsLocalISO(date) already in utils/date.ts
// JOIN sale_items; no separate N+1 query.
// Sort: created_at DESC (newest first).
```

#### `getSaleWithItems(db: Database, saleId: number): Promise<SaleWithItems | null>`

Returns a single sale with its items. Returns `null` if not found.

#### New types in `src/db/types.ts`

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
```

#### Tests (`src/__tests__/db/queries/sales.test.ts` additions)

- `listSalesByDate`: returns sales for the correct day; includes voided sales; excludes
  sales from other days; each sale has items attached.
- `getSaleWithItems`: returns correct sale + items; returns null for unknown id.

---

### 1B: `src/db/queries/utang.ts` — new file

#### `listOutstandingUtang(db: Database): Promise<UtangCustomer[]>`

Returns one row per customer who has at least one non-voided utang sale with a remaining
balance > 0. Remaining balance = `sale.total_centavos - COALESCE(SUM(utang_payments.amount_centavos), 0)`.

Sorted by `customer_name ASC`.

#### `getCustomerSales(db: Database, customerName: string): Promise<UnpaidSale[]>`

Returns non-voided utang sales for the given customer that still have a balance > 0.
Sorted `created_at ASC` (oldest first — FIFO order).

#### `recordUtangPayments(db: Database, payments: { saleId: number; amount: number }[]): Promise<void>`

Inserts all `utang_payments` rows inside a single DB transaction. Rolls back entirely on
any failure. `amount` is in centavos.

#### New types in `src/db/types.ts`

```ts
export interface UtangCustomer {
  customer_name: string;
  customer_phone: string | null;
  total_owed_centavos: number;  // sum across all unpaid sales
}

export interface UnpaidSale {
  id: number;
  total_centavos: number;
  created_at: string;
  paid_centavos: number;       // sum of utang_payments for this sale
  balance_centavos: number;    // total_centavos - paid_centavos
}
```

#### Tests (`src/__tests__/db/queries/utang.test.ts` — new file)

- `listOutstandingUtang`: customer appears when balance > 0; disappears after full
  payment; voided sale not included; partial payment reduces balance.
- `getCustomerSales`: returns only unpaid sales for that customer, sorted oldest first.
- `recordUtangPayments`: all rows inserted atomically; rollback on failure leaves DB
  unchanged.

---

### 1C: `src/utils/fifo.ts` + tests

Pure function — no DB access. Takes a sorted (oldest-first) list of unpaid sales and a
payment amount in centavos; returns the allocation.

```ts
export interface FifoAllocation {
  saleId: number;
  amount: number; // centavos
}

export function allocateFIFO(
  sales: UnpaidSale[],
  paymentCentavos: number,
): FifoAllocation[]
```

**Algorithm** (mirrors master spec §5.4):
1. Walk sales oldest-first.
2. For each sale: `apply = min(remaining, sale.balance_centavos)`. Emit allocation.
   `remaining -= apply`. Stop when `remaining === 0` or no more sales.
3. Throws `Error('overpayment')` if `paymentCentavos > totalBalance`. Caller caps input
   before calling.

**Tests** (`src/__tests__/utils/fifo.test.ts` — new file):
- Partial payment applied to oldest sale only.
- Payment spanning multiple sales.
- Exact full payment across all sales → all balances zeroed.
- `paymentCentavos > totalBalance` → throws.
- Empty sales array with `paymentCentavos = 0` → returns `[]`.

---

## Wave 2 — UI

All six components are built against the locked Wave 1 types. They live under
`src/screens/history/` unless noted.

### 2A: `HistoryScreen.tsx` (replaces placeholder)

The tab root. Structure:

```
Appbar (title "History", gear → Settings)
SegmentedControl: [Transactions | Utang]   ← reuse src/screens/settings/SegmentedControl.tsx
  if Transactions:
    TodayCards (reuse existing component; date-aware)
    Date chip: "Today ▾" / "Yesterday ▾" / "May 7 ▾" + DatePickerModal
    FlatList of TransactionRow
    Empty state: "No sales recorded on this day."
  if Utang:
    FlatList of UtangCustomerRow (inline, not a separate file)
    Empty state: "No outstanding utang. Nice!"
```

**State:**
- `segment: 'transactions' | 'utang'` (default `'transactions'`)
- `selectedDate: Date` (default today, reset to today on every tab focus)
- `sales: SaleWithItems[]`
- `utangCustomers: UtangCustomer[]`
- `datePickerVisible: boolean`

**Data loading:** `useFocusEffect` reloads both segments on every focus. Transactions
load `listSalesByDate(db, selectedDate)`; Utang loads `listOutstandingUtang(db)`.

**Date chip label:** use `formatDayLabel(selectedDate)` from `src/utils/date.ts` — already
handles Today / Yesterday / "May 7" / "May 7, 2025" cases. Append ` ▾` suffix.

**Date picker quick chips (inside modal):** Today, Yesterday, 7 days ago. Then a
`DateTimePicker` from `@react-native-community/datetimepicker` (installed via
`expo install @react-native-community/datetimepicker`). Future dates disabled
(`maximumDate={new Date()}`). Android uses `display="calendar"` mode.

**Utang segment:** date chip hidden. Tapping a `UtangCustomerRow` opens `MarkPaidSheet`.

**TodayCards date-awareness:** The existing `TodayCards` component calls
`todaySalesSummary` which uses today's date hardcoded. For the History tab we need a
date-aware version. Rather than modifying `TodayCards`, pass the already-loaded `sales`
array and compute totals inline in `HistoryScreen`:

```ts
const totalCentavos = sales.filter(s => !s.voided_at).reduce(...)
const profitCentavos = sales.filter(s => !s.voided_at).flatMap(s => s.items)...
```

Display as two `Card` components matching the existing TodayCards visual style. Card
labels: "Today's Sales" / "Today's Profit" for today, "Sales · May 7" / "Profit · May 7"
for other dates.

---

### 2B: `TransactionRow.tsx`

List row for the Transactions segment.

**Visual:**
- Left: time of sale (HH:MM format)
- Center: payment type badge (Cash — grey, Utang — orange), customer name below if utang
- Right: total in bold; if voided: total struck-through + faded, "Voided" label below

**Interaction:**
- Normal tap → navigates to `ReceiptDetail` screen (`navigation.push('ReceiptDetail', { saleId: sale.id })`)
- Long-press → `ActionSheet` (Paper `Menu`) with two items:
  - "View receipt" → same as tap
  - "Void this transaction" (disabled + grey if `voided_at` is set) → opens `VoidConfirmDialog`

**Props:**
```ts
interface TransactionRowProps {
  sale: SaleWithItems;
  onVoided: () => void; // parent reloads after void
}
```

---

### 2C: `ReceiptDetailScreen.tsx`

Pushed onto `RootStack`. Param: `{ saleId: number }`.

**Loads:** `getSaleWithItems(db, saleId)` on mount.

**Layout:**
```
Appbar: back button, title "Receipt", right action "Void" (if not voided_at)
Card: sale metadata (date/time, payment type, customer name if utang)
Divider
FlatList: items — product_name · qty × unit_price · line_total
Divider
Total row: bold
  If voided: "VOIDED" banner across the card
```

**Void action:** Tapping "Void" in Appbar opens `VoidConfirmDialog`. On confirm: calls
`voidSale`, pops back to History, parent reloads via `useFocusEffect`.

**Loading state:** `ActivityIndicator` while fetching. Error state: "Could not load receipt."

---

### 2D: `VoidConfirmDialog.tsx`

Reusable `Dialog` component.

```ts
interface VoidConfirmDialogProps {
  visible: boolean;
  saleId: number;
  onDismiss: () => void;
  onVoided: () => void;
}
```

On confirm: calls `voidSale(db, saleId)` then `onVoided()`. Shows loading state on
the confirm button while the DB write is in progress. Error toast on failure.

---

### 2E: `UtangLedger.tsx`

The Utang segment's list content, rendered directly inside `HistoryScreen` (not a
separate screen). Implemented as a component that receives `customers: UtangCustomer[]`
and an `onSelectCustomer` callback.

Each row:
- Left: person icon
- Center: customer name (bold), phone number below (if present, in grey)
- Right: outstanding balance in orange, bold

Tapping a row calls `onSelectCustomer(customer)` → parent opens `MarkPaidSheet`.

---

### 2F: `MarkPaidSheet.tsx`

Bottom sheet (Paper `Modal` + `Surface`) for recording a utang payment.

**Props:**
```ts
interface MarkPaidSheetProps {
  visible: boolean;
  customer: UtangCustomer | null;
  onDismiss: () => void;
  onPaid: () => void;
}
```

**State:**
- `amountText: string` (raw input)
- `unpaidSales: UnpaidSale[]` (loaded on open via `getCustomerSales`)
- `loading: boolean`

**Layout:**
```
Customer name (title)
Total outstanding (orange)
"All ₱X" quick button → sets amountText to full balance
TextInput: amount (numeric, peso)
Inline error if parseMoney(amountText) > totalOwed: "Cannot pay more than ₱X owed."
Confirm button (disabled while loading or amount invalid)
```

**On confirm:**
1. `allocateFIFO(unpaidSales, parseMoney(amountText))`
2. `recordUtangPayments(db, allocations)`
3. `onPaid()` → parent reloads utang list + dismisses sheet

---

## Navigation changes

### `src/navigation/types.ts`

```ts
export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  DisplaySettings: undefined;
  ReceiptDetail: { saleId: number }; // NEW
};
```

### `src/navigation/RootStack.tsx`

Add `<Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />`.

---

## File map

| File | Change |
|------|--------|
| `src/db/types.ts` | Add `SaleItem`, `SaleWithItems`, `UtangCustomer`, `UnpaidSale` |
| `src/db/queries/sales.ts` | Add `listSalesByDate`, `getSaleWithItems` |
| `src/db/queries/utang.ts` | **New** — `listOutstandingUtang`, `getCustomerSales`, `recordUtangPayments` |
| `src/utils/fifo.ts` | **New** — `allocateFIFO` |
| `src/navigation/types.ts` | Add `ReceiptDetail` route |
| `src/navigation/RootStack.tsx` | Register `ReceiptDetailScreen` |
| `src/screens/history/HistoryScreen.tsx` | Full replacement of placeholder |
| `src/screens/history/TransactionRow.tsx` | **New** |
| `src/screens/history/ReceiptDetailScreen.tsx` | **New** |
| `src/screens/history/VoidConfirmDialog.tsx` | **New** |
| `src/screens/history/UtangLedger.tsx` | **New** |
| `src/screens/history/MarkPaidSheet.tsx` | **New** |
| `src/__tests__/db/queries/sales.test.ts` | Add tests for two new query functions |
| `src/__tests__/db/queries/utang.test.ts` | **New** |
| `src/__tests__/utils/fifo.test.ts` | **New** |

---

## Acceptance criteria

### Transactions segment

- Opening History tab shows today's sales list and totals cards.
- Tapping "Today ▾" opens a date picker; selecting a past date refreshes list and cards.
- Future dates are disabled in the picker; quick chips for Today/Yesterday/7 days ago work.
- Date chip is hidden when the Utang segment is active.
- Switching tabs and returning resets the date back to today.
- Tapping a row navigates to `ReceiptDetail`.
- Long-pressing a row shows action sheet with "View receipt" and "Void this transaction".
- Voiding from the action sheet marks the sale voided; row updates to struck-through/faded.
- "Void" action is disabled (greyed out) on already-voided rows.
- `ReceiptDetail` shows all line items with correct quantities and prices.
- Voiding from `ReceiptDetail` pops back to History; the row shows as voided.
- Empty date → "No sales recorded on this day."

### Utang segment

- Utang tab shows all customers with outstanding balance; customer with zero balance disappears.
- Each row shows customer name, optional phone, total owed in orange.
- Tapping a customer opens `MarkPaidSheet`.
- "All ₱X" button fills the full outstanding amount.
- Paying less than the full balance reduces balance; customer stays in list.
- Paying the full balance removes the customer from the list.
- FIFO: payment applied to oldest sale first; newer sales' balances reduced only after older ones are cleared.
- Typing an amount > outstanding shows inline error and disables confirm.
- Empty utang list → "No outstanding utang. Nice!"

---

## Out of scope / deferred

- `customer_phone` display in History (field stored, not yet surfaced in UI)
- Backup & Restore
- Store name editing
- Date-range aggregations
