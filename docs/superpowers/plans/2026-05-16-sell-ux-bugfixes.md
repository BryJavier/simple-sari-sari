# Sell UX Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four device-tested bugs in the Sell tab and Add Product flow — no schema changes, no new routes.

**Architecture:** Four independent, isolated fixes. Each task touches 1-3 files and can be committed separately. No shared state changes — all store actions already exist.

**Tech Stack:** React Native 0.83.6, Expo SDK 55, TypeScript strict, react-native-paper, Zustand cart store, expo-camera.

---

### Task 1: CartSheet — Cart View/Edit Modal for Phone

**Spec:** Bug 1 in `docs/superpowers/specs/2026-05-16-sell-ux-bugfixes-design.md`

**Files:**
- Create: `src/screens/sell/CartSheet.tsx`
- Modify: `src/screens/sell/CartBar.tsx`
- Modify: `src/screens/sell/SellScreen.tsx`

**Context:**
- `CartBar` (`src/screens/sell/CartBar.tsx`) currently shows count + total + Pay button but is not interactive beyond Pay.
- `CartPane` (`src/screens/sell/CartPane.tsx`) already has the cart list UI pattern with `−/+` quantity controls — use it as a reference for `CartSheet`'s line items.
- Cart store (`src/store/cart.ts`) already has: `incrementItem(productId)`, `decrementItem(productId)` (removes at 0), `removeItem(productId)`, `cartTotalCentavos(items)`, `cartItemCount(items)`.
- `SellScreen` manages `payVisible` state and passes `onPay={() => setPayVisible(true)}` to CartBar. CartSheet also needs to open PaySheet.

**No tests needed** — UI-only, logic is already tested in store.

- [ ] **Step 1: Create `CartSheet.tsx`**

Create `src/screens/sell/CartSheet.tsx`:

```tsx
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Modal, Portal, Text } from 'react-native-paper';
import { useCartStore, cartTotalCentavos, cartItemCount } from '@/store/cart';
import type { CartItem } from '@/store/cart';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';

interface CartSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onPay: () => void;
}

function CartLineItem({ item }: { item: CartItem }) {
  const increment = useCartStore((s) => s.incrementItem);
  const decrement = useCartStore((s) => s.decrementItem);

  return (
    <View style={styles.lineItem}>
      <Text variant="bodyMedium" style={styles.itemName} numberOfLines={2}>
        {item.product.name}
      </Text>
      <View style={styles.qtyRow}>
        <IconButton icon="minus" size={16} onPress={() => decrement(item.product.id)} />
        <Text variant="bodyMedium">{item.quantity}</Text>
        <IconButton icon="plus" size={16} onPress={() => increment(item.product.id)} />
      </View>
      <Text variant="bodyMedium" style={styles.itemTotal}>
        {formatMoney(item.product.price_centavos * item.quantity)}
      </Text>
    </View>
  );
}

export function CartSheet({ visible, onDismiss, onPay }: CartSheetProps) {
  const items = useCartStore((s) => s.items);
  const total = cartTotalCentavos(items);
  const count = cartItemCount(items);

  function handlePay() {
    onDismiss();
    onPay();
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            Cart · {count} item{count !== 1 ? 's' : ''}
          </Text>
        </View>
        <Divider />
        {count === 0 ? (
          <Text variant="bodyMedium" style={styles.empty}>
            Cart is empty
          </Text>
        ) : (
          <>
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.product.id)}
              renderItem={({ item }) => <CartLineItem item={item} />}
              style={styles.list}
            />
            <Divider />
            <View style={styles.footer}>
              <Text variant="titleMedium" style={styles.total}>
                {formatMoney(total)}
              </Text>
              <View style={styles.footerActions}>
                <Button onPress={onDismiss}>Continue</Button>
                <Button mode="contained" onPress={handlePay}>
                  Pay
                </Button>
              </View>
            </View>
          </>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.card,
    margin: 24,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '75%',
  },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: palette.text },
  list: { flexGrow: 0 },
  empty: { padding: 24, color: palette.text3, textAlign: 'center' },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemName: { flex: 1, color: palette.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  itemTotal: { width: 80, textAlign: 'right', color: palette.text },
  footer: { padding: 16, gap: 8 },
  total: { color: palette.accent },
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
```

- [ ] **Step 2: Update `CartBar` to add `onViewCart` prop**

In `src/screens/sell/CartBar.tsx`, import `Pressable` from `react-native`. Add `onViewCart?: () => void` to `CartBarProps`. Wrap the count and total `Text` elements in a `Pressable` that calls `onViewCart`:

```tsx
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useCartStore, cartTotalCentavos, cartItemCount } from '@/store/cart';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';

interface CartBarProps {
  onPay: () => void;
  onViewCart?: () => void;
}

export function CartBar({ onPay, onViewCart }: CartBarProps) {
  const items = useCartStore((s) => s.items);
  const total = cartTotalCentavos(items);
  const count = cartItemCount(items);

  if (count === 0) return null;

  return (
    <View style={styles.bar}>
      <Pressable style={styles.info} onPress={onViewCart}>
        <Text variant="labelLarge" style={styles.count}>
          {count} item{count !== 1 ? 's' : ''}
        </Text>
        <Text variant="titleMedium" style={styles.total}>
          {formatMoney(total)}
        </Text>
      </Pressable>
      <Button mode="contained" onPress={onPay} compact>
        Pay
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  count: { color: palette.text3 },
  total: { color: palette.text },
});
```

- [ ] **Step 3: Wire CartSheet into `SellScreen`**

In `src/screens/sell/SellScreen.tsx`:
1. Add `import { CartSheet } from './CartSheet';`
2. Add state: `const [cartSheetVisible, setCartSheetVisible] = useState(false);`
3. Pass `onViewCart={() => setCartSheetVisible(true)}` to `CartBar`
4. Render `<CartSheet>` alongside the other modals:

```tsx
<CartSheet
  visible={cartSheetVisible}
  onDismiss={() => setCartSheetVisible(false)}
  onPay={() => setPayVisible(true)}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/sell/CartSheet.tsx src/screens/sell/CartBar.tsx src/screens/sell/SellScreen.tsx
git commit -m "feat(sell): CartSheet — tap cart bar to view and edit cart items"
```

---

### Task 2: Barcode Viewfinder Overlay

**Spec:** Bug 2 in `docs/superpowers/specs/2026-05-16-sell-ux-bugfixes-design.md`

**Files:**
- Modify: `src/screens/sell/BarcodeScannerModal.tsx`

**Context:**
- `BarcodeScannerModal` has a `cameraHalf` View (flex: 1) that contains `CameraView` with `StyleSheet.absoluteFillObject` and a close `IconButton`.
- Add the viewfinder overlay as another `View` child of `cameraHalf`, after `CameraView`, with `StyleSheet.absoluteFillObject` so it sits on top.
- The CameraView scans the full frame; this overlay is visual only.
- Scan zone dimensions: 260 wide × 120 tall. Corner brackets: 20 dp size, 3 dp border width, white color.

**No tests needed** — visual only.

- [ ] **Step 1: Add viewfinder overlay to `BarcodeScannerModal`**

In `src/screens/sell/BarcodeScannerModal.tsx`, add the viewfinder inside `cameraHalf`, between the `CameraView` and the close `IconButton`:

```tsx
{/* Viewfinder overlay */}
<View style={StyleSheet.absoluteFillObject} pointerEvents="none">
  <View style={styles.vfTop} />
  <View style={styles.vfMiddle}>
    <View style={styles.vfSide} />
    <View style={styles.vfWindow}>
      {/* Corner brackets */}
      <View style={[styles.vfCorner, styles.vfCornerTL]} />
      <View style={[styles.vfCorner, styles.vfCornerTR]} />
      <View style={[styles.vfCorner, styles.vfCornerBL]} />
      <View style={[styles.vfCorner, styles.vfCornerBR]} />
    </View>
    <View style={styles.vfSide} />
  </View>
  <View style={styles.vfBottom}>
    <Text style={styles.vfLabel}>Point at barcode</Text>
  </View>
</View>
```

Add to the stylesheet (inside `StyleSheet.create({...})`):

```tsx
vfTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
vfMiddle: { flexDirection: 'row', height: 120 },
vfSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
vfWindow: {
  width: 260,
  height: 120,
  position: 'relative',
},
vfBottom: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.55)',
  alignItems: 'center',
  paddingTop: 12,
},
vfLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
vfCorner: {
  position: 'absolute',
  width: 20,
  height: 20,
  borderColor: '#fff',
  borderWidth: 3,
},
vfCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
vfCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
vfCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
vfCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/sell/BarcodeScannerModal.tsx
git commit -m "feat(sell): add barcode viewfinder overlay to scanner modal"
```

---

### Task 3: Fix Continuous Barcode Scan Duplicates

**Spec:** Bug 3 in `docs/superpowers/specs/2026-05-16-sell-ux-bugfixes-design.md`

**Files:**
- Modify: `src/screens/sell/BarcodeScannerModal.tsx`

**Context:**
Current implementation uses `scanningRef: boolean` + 800ms timer. When a barcode stays in frame, the timer fires and resets the flag, triggering another add every 800ms.

Replace with `lastScannedRef: string | null`. Guard: if `lastScannedRef.current === data`, skip. Otherwise process and set the ref. Reset to null after 3 seconds.

The existing `debounceTimer` ref is kept but now stores the 3s reset timer instead of 800ms.

The `visible` effect cleanup already clears the timer and resets state — update it to reset `lastScannedRef.current = null` instead of `scanningRef.current = false`.

- [ ] **Step 1: Replace scan guard in `BarcodeScannerModal`**

In `src/screens/sell/BarcodeScannerModal.tsx`:

1. Replace `const scanningRef = useRef(false);` with `const lastScannedRef = useRef<string | null>(null);`

2. In the `visible` cleanup effect, replace `scanningRef.current = false;` with `lastScannedRef.current = null;`

3. Replace the `onBarcodeScanned` handler:

```tsx
onBarcodeScanned={({ data }) => {
  if (lastScannedRef.current === data) return;
  lastScannedRef.current = data;

  const product = products.find((p) => p.barcode === data);
  if (!product) {
    setSnackVisible(true);
  } else {
    addItem(product);
  }

  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    lastScannedRef.current = null;
    debounceTimer.current = null;
  }, 3000);
}}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/sell/BarcodeScannerModal.tsx
git commit -m "fix(sell): replace boolean scan debounce with last-barcode guard to prevent continuous duplicate adds"
```

---

### Task 4: Dismiss Keyboard Before BarcodeChooserSheet Opens

**Spec:** Bug 4 in `docs/superpowers/specs/2026-05-16-sell-ux-bugfixes-design.md`

**Files:**
- Modify: `src/screens/products/ProductFormScreen.tsx`

**Context:**
`ProductFormScreen` already imports from `react-native`. The "Choose" button `onPress` is `() => setBarcodeChooserVisible(true)`. Keyboard stays visible and overlaps the sheet.

`Keyboard` from `react-native` has `Keyboard.dismiss()` — call it synchronously before opening the sheet.

**No tests needed** — keyboard behavior cannot be unit tested.

- [ ] **Step 1: Add `Keyboard.dismiss()` to the Choose button**

In `src/screens/products/ProductFormScreen.tsx`:

1. Add `Keyboard` to the `react-native` import:
```tsx
import { Alert, ScrollView, View, StyleSheet, Keyboard } from 'react-native';
```

2. Update the "Choose" button `onPress`:
```tsx
onPress={() => {
  Keyboard.dismiss();
  setBarcodeChooserVisible(true);
}}
```

The button is at the `barcodeRow` section, currently:
```tsx
<Button
  mode="outlined"
  compact
  onPress={() => setBarcodeChooserVisible(true)}
>
  Choose
</Button>
```

Becomes:
```tsx
<Button
  mode="outlined"
  compact
  onPress={() => {
    Keyboard.dismiss();
    setBarcodeChooserVisible(true);
  }}
>
  Choose
</Button>
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /path/to/project && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/products/ProductFormScreen.tsx
git commit -m "fix(products): dismiss keyboard before opening BarcodeChooserSheet"
```

---

## Running Tests

After all tasks:

```bash
npx jest --testPathPattern="src/__tests__"
```

Expected: all tests pass (no test changes required — these are UI-only fixes except the scan guard which has no pure unit test surface).

Also run TypeScript:

```bash
npx tsc --noEmit
```

Expected: no errors.
