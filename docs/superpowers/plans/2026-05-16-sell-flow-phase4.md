# Sell Flow Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four improvements to the Sell tab: catalog sync on focus, denomination picker + change calculation in PaySheet, optional customer phone for utang sales, and a persistent barcode-scan mode.

**Architecture:** Feature 1 replaces a single mount-time `useEffect` with two hooks (`useEffect` for seed, `useFocusEffect` for catalog). Features 2 and 3 are purely additive changes to `PaySheet.tsx`. Feature 4 is a new `BarcodeScannerModal` wired into `SellScreen`. The only database change is a single additive `ALTER TABLE` migration (`v2`) that adds `customer_phone TEXT` to `sales`.

**Tech Stack:** React Native 0.83.6, Expo SDK 55, expo-camera (already installed), react-native-paper, Zustand cart store, expo-sqlite, Jest (Node runner via `openTestDatabase`)

---

## File Map

| File | Change |
|---|---|
| `src/db/migrationFiles/v2.ts` | **New** — `ALTER TABLE sales ADD COLUMN customer_phone TEXT` |
| `src/db/migrations.ts` | Add v2 block, bump `CURRENT_SCHEMA_VERSION` to 2 |
| `src/db/queries/sales.ts` | Add `customerPhone?: string` to `createSale` input + INSERT |
| `src/__tests__/db/queries/sales.test.ts` | Two new tests for `customerPhone` |
| `src/screens/sell/SellScreen.tsx` | Split `useEffect` into seed + `useFocusEffect`; add scan button + `BarcodeScannerModal` |
| `src/screens/sell/PaySheet.tsx` | Add tendered state, denomination grid, change display, contact number field |
| `src/screens/sell/BarcodeScannerModal.tsx` | **New** — full-screen split-screen scanning modal |

---

## Task 1: DB Migration v2 + createSale customerPhone

**Files:**
- Create: `src/db/migrationFiles/v2.ts`
- Modify: `src/db/migrations.ts`
- Modify: `src/db/queries/sales.ts`
- Test: `src/__tests__/db/queries/sales.test.ts`

- [ ] **Step 1: Write the failing tests**

Add two new tests inside `describe('createSale')` in `src/__tests__/db/queries/sales.test.ts`
(after the existing `'stores customer_name for utang sales'` test):

```ts
it('stores customer_phone when provided for utang sale', async () => {
  const saleId = await createSale(db, {
    items: [{ product, quantity: 1 }],
    paymentType: 'utang',
    customerName: 'Aling Nena',
    customerPhone: '09171234567',
  });
  const sale = await db.get<{ customer_phone: string | null }>(
    'SELECT customer_phone FROM sales WHERE id = ?',
    [saleId],
  );
  expect(sale?.customer_phone).toBe('09171234567');
});

it('stores NULL customer_phone when not provided', async () => {
  const saleId = await createSale(db, {
    items: [{ product, quantity: 1 }],
    paymentType: 'utang',
    customerName: 'Juan',
  });
  const sale = await db.get<{ customer_phone: string | null }>(
    'SELECT customer_phone FROM sales WHERE id = ?',
    [saleId],
  );
  expect(sale?.customer_phone).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/__tests__/db/queries/sales.test.ts --no-coverage
```

Expected: both new tests FAIL — `customer_phone` column does not exist yet.

- [ ] **Step 3: Create the migration file**

Create `src/db/migrationFiles/v2.ts`:

```ts
export const v2Migration = `ALTER TABLE sales ADD COLUMN customer_phone TEXT;`;
```

- [ ] **Step 4: Update migrations.ts**

The current file (`src/db/migrations.ts`) imports `v1Schema` and has `CURRENT_SCHEMA_VERSION = 1`
with one migration block (`if (current < 1)`). Make three changes:

**1. Add the v2 import** after the v1 import line:
```ts
import { v2Migration } from '@/db/migrationFiles/v2';
```

**2. Bump the version constant:**
```ts
export const CURRENT_SCHEMA_VERSION = 2;
```

**3. Add the v2 block** inside `applyMigrations`, immediately after the closing brace of the
`current < 1` block. The pattern is identical to the v1 block — call `db.exec` with the
migration string, then call `setSchemaVersion` with the new version:

```ts
  if (current < 2) {
    await db.exec(v2Migration);
    await setSchemaVersion(db, 2);
  }
```

- [ ] **Step 5: Update createSale in sales.ts**

Add `customerPhone?: string` to the `createSale` input type (the inline interface at the
function signature). The full updated signature:

```ts
export async function createSale(
  db: Database,
  input: {
    items: CartItemInput[];
    paymentType: 'cash' | 'utang';
    customerName?: string;
    customerPhone?: string;
  },
): Promise<number>
```

Update the INSERT statement inside the transaction. Change from:

```sql
INSERT INTO sales (total_centavos, payment_type, customer_name, created_at)
VALUES (?, ?, ?, ?)
```

to:

```sql
INSERT INTO sales (total_centavos, payment_type, customer_name, customer_phone, created_at)
VALUES (?, ?, ?, ?, ?)
```

The `db.run()` parameters array becomes:
```ts
[totalCentavos, input.paymentType, input.customerName ?? null, input.customerPhone ?? null, todayISO()]
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx jest src/__tests__/db/queries/sales.test.ts --no-coverage
```

Expected: all tests PASS (including the two new ones). Should be 11 tests passing.

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/db/migrationFiles/v2.ts src/db/migrations.ts src/db/queries/sales.ts src/__tests__/db/queries/sales.test.ts
git commit -m "feat(db): add customer_phone column via migration v2, extend createSale"
```

---

## Task 2: SellScreen Catalog Sync on Focus

**Files:**
- Modify: `src/screens/sell/SellScreen.tsx`

- [ ] **Step 1: Add useFocusEffect to the navigation import**

Current import line:
```ts
import { useNavigation } from '@react-navigation/native';
```

Change to:
```ts
import { useNavigation, useFocusEffect } from '@react-navigation/native';
```

`useCallback` is already imported from `'react'`.

- [ ] **Step 2: Replace the combined useEffect with two separate hooks**

Current code:
```ts
useEffect(() => {
  async function init() {
    await seedSampleProducts(db);
    setProducts(await listActiveProducts(db));
  }
  init();
}, [db]);
```

Replace with:
```ts
useEffect(() => {
  seedSampleProducts(db);
}, [db]);

useFocusEffect(
  useCallback(() => {
    listActiveProducts(db).then(setProducts);
  }, [db]),
);
```

The `useEffect` fires once per `db` instance (on app launch) and seeds sample data silently.
The `useFocusEffect` fires every time the Sell tab comes into focus and reloads the live catalog.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/sell/SellScreen.tsx
git commit -m "feat(sell): reload catalog on tab focus via useFocusEffect"
```

---

## Task 3: PaySheet — Denomination Grid, Change Display, Contact Number

**Files:**
- Modify: `src/screens/sell/PaySheet.tsx`

This task updates PaySheet with: (1) a 3×3 denomination button grid in cash mode,
(2) a change/shortfall display row, and (3) an optional contact number field in utang mode.

- [ ] **Step 1: Update the react-native import to include Pressable**

Change:
```ts
import { View, StyleSheet } from 'react-native';
```
To:
```ts
import { View, StyleSheet, Pressable } from 'react-native';
```

- [ ] **Step 2: Update the money import to include parseMoney and isValidMoneyInput**

Change:
```ts
import { formatMoney } from '@/utils/money';
```
To:
```ts
import { formatMoney, parseMoney, isValidMoneyInput } from '@/utils/money';
```

- [ ] **Step 3: Add the DENOMINATION_ROWS constant before the component**

```ts
const DENOMINATION_ROWS = [
  [1, 5, 10],
  [20, 50, 100],
  [200, 500, 1000],
] as const;
```

- [ ] **Step 4: Add new state variables inside PaySheet()**

After the existing state declarations, add:
```ts
const [customerPhone, setCustomerPhone] = useState('');
const [tenderedText, setTenderedText] = useState('');
```

- [ ] **Step 5: Add computed values after `const total = ...`**

```ts
const tenderedCentavos = tenderedText !== '' ? parseMoney(tenderedText) : 0;
const changeCentavos = tenderedCentavos - total;
```

- [ ] **Step 6: Update canConfirm**

Replace:
```ts
const canConfirm = !loading && (paymentType === 'cash' || customerName.trim().length > 0);
```
With:
```ts
const canConfirm =
  !loading &&
  (paymentType === 'utang'
    ? customerName.trim().length > 0
    : tenderedText !== '' && tenderedCentavos >= total);
```

- [ ] **Step 7: Add handleDismiss to reset all state on close**

```ts
function handleDismiss() {
  setTenderedText('');
  setCustomerName('');
  setCustomerPhone('');
  setPaymentType('cash');
  onDismiss();
}
```

Update `<Modal onDismiss={...}>` and the Cancel `<Button onPress={...}>` to call `handleDismiss`.

- [ ] **Step 8: Update handleConfirm to reset new state and pass customerPhone**

Inside `handleConfirm`, after `clearCart()` add:
```ts
setTenderedText('');
setCustomerName('');
setCustomerPhone('');
```

Update the `createSale` call:
```ts
const saleId = await createSale(db, {
  items,
  paymentType,
  customerName: paymentType === 'utang' ? customerName.trim() : undefined,
  customerPhone:
    paymentType === 'utang' && customerPhone.trim()
      ? customerPhone.trim()
      : undefined,
});
```

- [ ] **Step 9: Add denomination grid + tendered field + change row (cash mode JSX)**

After `<SegmentedButtons>` and before the utang section, insert:
```tsx
{paymentType === 'cash' && (
  <>
    <Text style={styles.denomLabel}>Quick amount</Text>
    <View style={styles.denomGrid}>
      {DENOMINATION_ROWS.map((row) => (
        <View key={row.join('-')} style={styles.denomRow}>
          {row.map((amount) => {
            const above = amount * 100 >= total;
            return (
              <Pressable
                key={amount}
                style={[
                  styles.denomBtn,
                  above ? styles.denomBtnAbove : styles.denomBtnBelow,
                ]}
                onPress={() => setTenderedText(String(amount))}
              >
                <Text style={styles.denomText}>₱{amount}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>

    <TextInput
      label="Amount tendered (₱)"
      value={tenderedText}
      onChangeText={(t) => {
        if (t === '' || isValidMoneyInput(t)) setTenderedText(t);
      }}
      keyboardType="decimal-pad"
      style={styles.input}
    />

    {tenderedText !== '' && (
      <View
        style={[
          styles.changeRow,
          changeCentavos >= 0 ? styles.changeRowOk : styles.changeRowShort,
        ]}
      >
        <Text style={changeCentavos >= 0 ? styles.changeTextOk : styles.changeTextShort}>
          {changeCentavos >= 0
            ? `Change ${formatMoney(changeCentavos)}`
            : `Short by ${formatMoney(-changeCentavos)}`}
        </Text>
      </View>
    )}
  </>
)}
```

- [ ] **Step 10: Add the contact number TextInput to the utang block**

Replace the current utang block:
```tsx
{paymentType === 'utang' && (
  <TextInput
    label="Customer name"
    value={customerName}
    onChangeText={setCustomerName}
    style={styles.input}
    autoFocus
  />
)}
```
With:
```tsx
{paymentType === 'utang' && (
  <>
    <TextInput
      label="Customer name"
      value={customerName}
      onChangeText={setCustomerName}
      style={styles.input}
      autoFocus
    />
    <TextInput
      label="Contact number — optional"
      value={customerPhone}
      onChangeText={setCustomerPhone}
      keyboardType="phone-pad"
      style={styles.input}
    />
  </>
)}
```

- [ ] **Step 11: Append new StyleSheet entries to the existing StyleSheet.create**

```ts
denomLabel: {
  fontSize: 11,
  color: palette.text3,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6,
},
denomGrid: { gap: 6, marginBottom: 12 },
denomRow: { flexDirection: 'row', gap: 6 },
denomBtn: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 6,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
},
denomBtnAbove: { backgroundColor: palette.softBg, borderColor: palette.border },
denomBtnBelow: {
  backgroundColor: palette.surface,
  borderColor: palette.borderLight,
  opacity: 0.4,
},
denomText: { fontSize: 14, fontWeight: '600', color: palette.primary },
changeRow: {
  borderRadius: 6,
  paddingVertical: 10,
  paddingHorizontal: 14,
  marginBottom: 12,
},
changeRowOk: { backgroundColor: palette.successBg },
changeRowShort: { backgroundColor: '#FFEBEE' },
changeTextOk: { fontSize: 16, fontWeight: '700', color: palette.success },
changeTextShort: { fontSize: 16, fontWeight: '700', color: palette.danger },
```

- [ ] **Step 12: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 13: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 14: Commit**

```bash
git add src/screens/sell/PaySheet.tsx
git commit -m "feat(sell): denomination grid, change display, contact number in PaySheet"
```

---

## Task 4: BarcodeScannerModal

**Files:**
- Create: `src/screens/sell/BarcodeScannerModal.tsx`

- [ ] **Step 1: Create the file**

Create `src/screens/sell/BarcodeScannerModal.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Modal, Portal, Text, Snackbar, IconButton } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCartStore, cartTotalCentavos } from '@/store/cart';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { Product } from '@/db/types';

interface BarcodeScannerModalProps {
  visible: boolean;
  products: Product[];
  onDismiss: () => void;
}

export function BarcodeScannerModal({
  visible,
  products,
  onDismiss,
}: BarcodeScannerModalProps) {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const [permission, requestPermission] = useCameraPermissions();
  const [snackVisible, setSnackVisible] = useState(false);
  const scanningRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    if (permission?.granted) return;
    requestPermission().then((result) => {
      if (!result.granted) onDismiss();
    });
    // intentionally only re-runs when the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const total = cartTotalCentavos(items);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={StyleSheet.absoluteFillObject}
      >
        <View style={styles.root}>
          {/* Top half: live camera */}
          <View style={styles.cameraHalf}>
            {permission?.granted && visible && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={({ data }) => {
                  if (scanningRef.current) return;
                  const product = products.find((p) => p.barcode === data);
                  if (!product) {
                    setSnackVisible(true);
                    return;
                  }
                  scanningRef.current = true;
                  addItem(product);
                  setTimeout(() => {
                    scanningRef.current = false;
                  }, 800);
                }}
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr'],
                }}
              />
            )}
            <IconButton
              icon="close"
              iconColor="white"
              size={28}
              style={styles.closeBtn}
              onPress={onDismiss}
            />
          </View>

          {/* Bottom half: scrollable cart list */}
          <View style={styles.cartHalf}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartHeaderText}>
                Cart · {items.length} item{items.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <ScrollView style={styles.cartScroll}>
              {items.map((item) => (
                <View key={item.product.id} style={styles.cartRow}>
                  <View style={styles.cartRowInfo}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemDetail}>
                      {formatMoney(item.product.price_centavos)} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={styles.cartItemTotal}>
                    {formatMoney(item.product.price_centavos * item.quantity)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.doneBtn} onPress={onDismiss}>
              <Text style={styles.doneBtnText}>Done · {formatMoney(total)}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2000}
      >
        Barcode not found
      </Snackbar>
    </Portal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  cameraHalf: { flex: 1, position: 'relative' },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cartHalf: { flex: 1, backgroundColor: palette.card },
  cartHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  cartHeaderText: {
    fontSize: 11,
    color: palette.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cartScroll: { flex: 1 },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  cartRowInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: '600', color: palette.text },
  cartItemDetail: { fontSize: 12, color: palette.text3, marginTop: 2 },
  cartItemTotal: { fontSize: 14, fontWeight: '600', color: palette.primary },
  doneBtn: { backgroundColor: palette.primary, paddingVertical: 14 },
  doneBtnText: {
    color: palette.card,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});
```

The `Snackbar` is placed as a sibling of `Modal` inside the same `Portal`. Both render through
the portal host, so the Snackbar (rendered last) appears on top of the full-screen modal while
the camera stays open. The camera is conditionally rendered only when `permission?.granted && visible`
to prevent it persisting after the modal dismisses.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/sell/BarcodeScannerModal.tsx
git commit -m "feat(sell): add BarcodeScannerModal with split-screen camera + live cart"
```

---

## Task 5: Wire Scan Button into SellScreen

**Files:**
- Modify: `src/screens/sell/SellScreen.tsx`

- [ ] **Step 1: Add the BarcodeScannerModal import**

After the existing sell-screen component imports, add:
```ts
import { BarcodeScannerModal } from './BarcodeScannerModal';
```

- [ ] **Step 2: Add scannerVisible state**

Inside `SellScreen()`, alongside the existing state declarations:
```ts
const [scannerVisible, setScannerVisible] = useState(false);
```

- [ ] **Step 3: Add the scan Appbar button**

Replace the current `<Appbar.Header>` block:
```tsx
<Appbar.Header>
  <Appbar.Content title="Sell" />
  <Appbar.Action
    icon="cog"
    onPress={() => navigation.navigate('Settings')}
    accessibilityLabel="Settings"
  />
</Appbar.Header>
```
With:
```tsx
<Appbar.Header>
  <Appbar.Content title="Sell" />
  <Appbar.Action
    icon="barcode-scan"
    onPress={() => setScannerVisible(true)}
    accessibilityLabel="Scan barcode"
  />
  <Appbar.Action
    icon="cog"
    onPress={() => navigation.navigate('Settings')}
    accessibilityLabel="Settings"
  />
</Appbar.Header>
```

- [ ] **Step 4: Render BarcodeScannerModal**

Add the modal alongside `PaySheet` (and any other modal components at the bottom of the JSX):
```tsx
<BarcodeScannerModal
  visible={scannerVisible}
  products={products}
  onDismiss={() => setScannerVisible(false)}
/>
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/screens/sell/SellScreen.tsx
git commit -m "feat(sell): add barcode-scan Appbar button wired to BarcodeScannerModal"
```

---

## Task 6: Smoke Test Checklist

No code changes. Verify every acceptance criterion manually on device or simulator.

**Feature 1 — Catalog sync on focus:**

- [ ] Add a product in the Products tab, switch to Sell — new product appears immediately in the grid.
- [ ] Archive a product in the Products tab, switch to Sell — product is gone from the grid.
- [ ] Edit a product name/price in the Products tab, switch to Sell — updated values show.
- [ ] Fresh install / empty DB — sample products still seed correctly.

**Feature 2 — Amount tendered + change:**

- [ ] Open PaySheet (Cash mode), total = ₱45.00. Buttons ₱50–₱1000 are full-contrast; ₱1, ₱5, ₱10, ₱20 are dimmed (opacity 0.4).
- [ ] Tap ₱50 — tendered field fills "50", green "Change ₱5.00" row appears, Confirm is enabled.
- [ ] Tap ₱20 — red "Short by ₱25.00" row appears, Confirm is disabled.
- [ ] Type "100" in the manual field — green "Change ₱55.00".
- [ ] Clear the field — change row disappears, Confirm is disabled.
- [ ] Switch to Utang mode — denomination grid and tendered field are hidden entirely.
- [ ] Dismiss and re-open PaySheet — tendered field is empty (clean state).

**Feature 3 — Customer contact number:**

- [ ] Utang mode shows "Customer name" then "Contact number — optional" fields.
- [ ] Confirm with a phone number — sale records; DB row has `customer_phone` set.
- [ ] Confirm without a phone number — sale records; DB row has `customer_phone = NULL`.
- [ ] Confirm button is NOT blocked by an empty contact number field.
- [ ] Contact number field is absent in Cash mode.

**Feature 4 — Barcode scan mode:**

- [ ] Barcode-scan icon appears in Sell tab Appbar between title and Settings cog.
- [ ] Tap the icon on first launch — camera permission prompt appears.
- [ ] Deny permission — modal closes gracefully, no crash.
- [ ] Grant permission — split-screen opens: camera on top half, cart list on bottom half.
- [ ] Scan a known barcode — product added to cart list immediately; camera stays open.
- [ ] Scan same barcode again — quantity increments in the cart list.
- [ ] Scan an unknown barcode — "Barcode not found" toast appears for 2 s; camera continues.
- [ ] Cart list in bottom half updates in real time after each scan.
- [ ] Tap "Done · ₱X.XX" — modal closes, cart is preserved; tap Pay to complete.
- [ ] Tap × — modal closes, cart is preserved.
- [ ] Rapid-scan: wave a barcode quickly — item added once, not multiple times (800 ms debounce working).
