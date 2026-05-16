# Sell Flow Phase 4 — Design Spec

**Date:** 2026-05-16
**Status:** Approved

## Overview

Four improvements to the Sell tab:

1. **Product sync** — catalog in the Sell tab goes stale after adding/editing products in the Products tab. Fix: reload on tab focus.
2. **Amount tendered + change** — cashier has no way to calculate change. Fix: denomination buttons + manual field in PaySheet.
3. **Customer contact number** — utang sales only capture a name. Fix: optional phone field stored in the DB.
4. **Barcode scan mode** — cashier must tap each product tile manually. Fix: persistent camera scanning session with live cart view.

---

## Feature 1: Sell Tab Product Sync

### Problem

`SellScreen` uses a single `useEffect([db])` that both seeds sample products and loads the catalog. Because `useEffect` only runs on mount, any product added, edited, or archived in the Products tab is invisible on the Sell tab until the app is restarted.

### Solution

Separate the two concerns in `SellScreen.tsx`:

- **Seed** (initialization, runs once): `useEffect([db])` calls `seedSampleProducts(db)`.
- **Catalog load** (data sync, runs on every focus): `useFocusEffect` calls `listActiveProducts(db)` and updates `products` state.

This is identical to the pattern already used in `ProductListScreen`.

### Acceptance Criteria

- Adding a product in the Products tab and switching back to Sell shows the new product in the catalog grid immediately.
- Archiving a product in the Products tab and switching back removes it from the grid.
- Editing a product name/price in the Products tab is reflected in the grid on next focus.
- Sample products are still seeded on first launch for empty databases.

---

## Feature 2: Amount Tendered + Change Calculation

### Problem

The PaySheet shows the total and a Cash/Utang toggle but gives the cashier no way to calculate change. The cashier must do the math mentally.

### Solution

Cash mode gains a denomination picker and a change display. No database changes — tendered amount is display-only.

### UI: Denomination Grid

A 3×3 grid of buttons covering all Philippine denominations:

```
₱1    ₱5    ₱10
₱20   ₱50   ₱100
₱200  ₱500  ₱1000
```

**Button states (dynamic, based on cart total):**
- Denominations **≥ total**: full contrast — the primary tap targets.
- Denominations **< total**: dimmed (opacity 0.4), still tappable (edge case: exact coins).

Tapping any button sets `tenderedText` to that peso value (e.g. tapping ₱50 sets `"50"`).

### UI: Manual Entry Field

A `TextInput` below the grid labelled "Amount tendered (₱)". Uses `isValidMoneyInput` validation. Denomination buttons and the manual field share the same `tenderedText` state — tapping a button fills the field.

### UI: Change Display

Row rendered below the manual field at all times when `tenderedText` is non-empty:

| State | Appearance |
|---|---|
| `parseMoney(tenderedText) >= total` | Green background, `"Change ₱X.XX"` |
| `parseMoney(tenderedText) < total` | Red background, `"Short by ₱X.XX"` |

### Confirm Button

Disabled when:
- `loading` is true, OR
- `paymentType === 'cash'` AND (`tenderedText` is empty OR `parseMoney(tenderedText) < total`)

Utang mode confirm remains gated on customer name only (unchanged).

### State Reset

`tenderedText` resets to `''` on dismiss, alongside the existing `customerName` and `paymentType` resets.

### Acceptance Criteria

- Tapping ₱50 with a ₱45.00 total shows "Change ₱5.00" in green.
- Tapping ₱20 with a ₱45.00 total shows "Short by ₱25.00" in red and disables Confirm.
- Typing `100` in the manual field shows "Change ₱55.00".
- Confirm is disabled until a valid amount ≥ total is entered.
- Denominations < total are visibly dimmed.
- Utang mode hides the denomination grid and tendered field entirely.
- Reopening PaySheet shows a clean state (no leftover tendered amount).

---

## Feature 3: Customer Contact Number (Utang Mode)

### Problem

Utang sales only record a customer name. The store owner has no way to follow up on outstanding credit via phone.

### Solution

Add an optional `customer_phone` column to the `sales` table. Utang mode in PaySheet gains a second optional field for the contact number.

### Database Migration (v2)

File: `src/db/migrationFiles/v2.ts`

```sql
ALTER TABLE sales ADD COLUMN customer_phone TEXT;
```

`src/db/migrations.ts`: add the v2 migration block, bump `CURRENT_SCHEMA_VERSION` to `2`.

### Query Changes

`src/db/queries/sales.ts` — `createSale` input:

```ts
interface CreateSaleInput {
  items: CartItemInput[];
  paymentType: 'cash' | 'utang';
  customerName?: string;
  customerPhone?: string; // new, optional
}
```

The `customer_phone` column is included in the `INSERT` statement.

### UI Changes (`PaySheet.tsx`)

Utang mode shows (in order):
1. Customer name `TextInput` — required, existing
2. Contact number `TextInput` — optional, new, `keyboardType="phone-pad"`, label: "Contact number — optional"

`canConfirm` for utang remains gated on `customerName` only. Contact number has no validation.

New state: `customerPhone: string` (resets to `''` on dismiss).

### Acceptance Criteria

- Completing an utang sale with a phone number stores it in `customer_phone`.
- Completing an utang sale without a phone number stores `NULL` in `customer_phone` (optional field).
- Confirm is not blocked by an empty contact number.
- Contact number field is absent in cash mode.

---

## Feature 4: Barcode Scan Mode

### Problem

The cashier must tap each product tile individually to build an order. For larger orders, barcode scanning would be faster and less error-prone.

### Solution

A persistent full-screen scanning session launched from the Sell tab Appbar. The camera stays open between scans. A live cart list is visible at all times so the cashier can see the running order.

### Entry Point

`SellScreen` Appbar gains a `barcode-scan` icon button between the title and the Settings cog. Tapping it opens `BarcodeScannerModal`.

### `BarcodeScannerModal` — Layout

Full-screen `Portal` + `Modal`. Screen split vertically:

- **Top half** — `CameraView` with the standard barcode targeting frame. A close `×` button in the top-right corner.
- **Bottom half** — scrollable cart list (white background) showing each item currently in the cart: name, qty, line total. Footer row shows "Done · ₱X.XX" button.

### Scan Behaviour

- Uses `CameraView` + `useCameraPermissions` from `expo-camera` (already installed).
- Permission is requested on modal open if not yet granted. If denied, modal closes.
- `barcodeScannerSettings.barcodeTypes`: `['ean13', 'ean8', 'code128', 'code39', 'qr']` — same set as `ProductFormScreen`.
- On successful scan: look up `products.find(p => p.barcode === data)`.
  - **Found** → call `addItem(product)` (increments qty if already in cart). Cart list updates immediately.
  - **Not found** → show `Snackbar` toast: `"Barcode not found"` for 2 seconds. Camera continues scanning.
- **Debounce**: a `useRef<boolean>` flag (`scanning`) prevents duplicate additions. On a successful scan, the flag is set to `true` and a `setTimeout` of 800 ms resets it to `false`. Scans that arrive while the flag is `true` are ignored.

### Done

Tapping "Done" calls `onDismiss`. The cart persists (same as tapping tiles). The cashier can then tap Pay as usual.

### Props

```ts
interface BarcodeScannerModalProps {
  visible: boolean;
  products: Product[];
  onDismiss: () => void;
}
```

The component reads `useCartStore` directly for the live cart list display and `addItem`.

### Acceptance Criteria

- Scanning a product barcode adds it to the cart; scanning the same barcode again increments qty.
- The cart list in the bottom half updates in real time after each scan.
- Scanning an unknown barcode shows "Barcode not found" toast; scanning continues.
- The camera stays open between scans until "Done" is tapped.
- The cart is not cleared when the scanner closes — the cashier proceeds to Pay normally.
- The 800 ms debounce prevents duplicate additions from a single slow scan.
- Camera permission is requested on first open; denied permission closes the modal gracefully.
- The scan button is visible in the Sell tab Appbar alongside the Settings cog.

---

## File Map

| File | Change |
|---|---|
| `src/screens/sell/SellScreen.tsx` | Split `useEffect` into seed + `useFocusEffect`; add scan button + `BarcodeScannerModal` |
| `src/screens/sell/PaySheet.tsx` | Add tendered state, denomination grid, change display, contact number field |
| `src/screens/sell/BarcodeScannerModal.tsx` | **New** — split-screen scanning modal |
| `src/db/migrationFiles/v2.ts` | **New** — `ALTER TABLE sales ADD COLUMN customer_phone TEXT` |
| `src/db/migrations.ts` | Add v2 block, bump `CURRENT_SCHEMA_VERSION` to 2 |
| `src/db/queries/sales.ts` | Add `customerPhone` to `createSale` input and INSERT |
| `src/__tests__/db/queries/sales.test.ts` | Tests for `customerPhone` in `createSale` |

---

## Out of Scope

- Storing the tendered amount in the database.
- Showing contact numbers in the History tab.
- Adding new products from the scanner when a barcode is not found.
- Barcode scanning on tablet (same feature, same modal — no special tablet layout needed).
