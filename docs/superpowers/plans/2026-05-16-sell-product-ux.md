# Sell & Product UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four UX improvements — tap sound in sell tab, viewfinder in products camera, descriptive barcode error, and ROI scan filtering.

**Architecture:** Four tasks. Tasks 1 and 3 are fully independent. Task 2 must complete before Task 4 (both touch `BarcodeScannerModal` and `ProductFormScreen` — Task 2 extracts the viewfinder component and restructures the camera modal, Task 4 adds layout refs and ROI logic on top of that).

**Tech Stack:** React Native 0.83.6, Expo SDK 55, TypeScript strict, react-native-paper, expo-audio, expo-camera.

**Ordering:** Task 1 → Task 2 → Task 3 → Task 4 (Task 2 must precede Task 4; others are flexible).

---

### Task 1: Beep Sound on Product Tap in Sell Tab

**Spec:** Feature 1 in `docs/superpowers/specs/2026-05-16-sell-product-ux-design.md`

**Files:**
- Modify: `src/screens/sell/SellScreen.tsx`

**Context:**
- `SellScreen` already imports `useAudioPlayer` — wait, it doesn't yet. It needs to be added.
- The beep asset is at `assets/sounds/beep.wav` (created in a previous task)
- `expo-audio` is already installed
- `CatalogGrid` `onPress` prop in SellScreen is currently: `onPress={(p) => addItem(p)}`
- The correct require path from `src/screens/sell/SellScreen.tsx` to the asset is `'../../assets/sounds/beep.wav'`

**No tests needed** — audio playback, UI interaction.

- [ ] **Step 1: Add useAudioPlayer to SellScreen**

Read `src/screens/sell/SellScreen.tsx`.

Add `useAudioPlayer` import from `expo-audio`:
```tsx
import { useAudioPlayer } from 'expo-audio';
```

Add the player just before the state declarations (after `const addItem = ...`):
```tsx
const beepPlayer = useAudioPlayer(require('../../assets/sounds/beep.wav'));
```

- [ ] **Step 2: Play beep on product tap**

Update the `CatalogGrid` `onPress` prop from:
```tsx
onPress={(p) => addItem(p)}
```
To:
```tsx
onPress={(p) => {
  addItem(p);
  try { beepPlayer.seekTo(0); beepPlayer.play(); } catch {}
}}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari"
git add src/screens/sell/SellScreen.tsx
git commit -m "feat(sell): play beep sound when tapping product in catalog"
```

---

### Task 2: BarcodeViewfinder Component + Products Camera Overlay

**Spec:** Feature 2 in `docs/superpowers/specs/2026-05-16-sell-product-ux-design.md`

**Files:**
- Create: `src/components/BarcodeViewfinder.tsx`
- Modify: `src/screens/sell/BarcodeScannerModal.tsx`
- Modify: `src/screens/products/ProductFormScreen.tsx`

**Context:**
- `BarcodeScannerModal` currently has the viewfinder inlined as a `View` block inside `cameraHalf`. Extract this into `BarcodeViewfinder` and replace inline code with `<BarcodeViewfinder />`.
- `ProductFormScreen` camera modal is a `Portal > Modal > CameraView + IconButton` structure. The `CameraView` uses `StyleSheet.absoluteFillObject`. The viewfinder should sit on top of the CameraView (same `absoluteFillObject`) before the close `IconButton`.
- Read both files before editing.

**No tests needed** — pure UI.

- [ ] **Step 1: Create `src/components/BarcodeViewfinder.tsx`**

The component is the exact viewfinder markup currently inside `BarcodeScannerModal`, moved to its own file. It uses `StyleSheet.absoluteFillObject` and `pointerEvents="none"`:

```tsx
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export function BarcodeViewfinder() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={styles.vfTop} />
      <View style={styles.vfMiddle}>
        <View style={styles.vfSide} />
        <View style={styles.vfWindow}>
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
  );
}

const styles = StyleSheet.create({
  vfTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  vfMiddle: { flexDirection: 'row', height: 120 },
  vfSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  vfWindow: { width: 260 },
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
});
```

- [ ] **Step 2: Update BarcodeScannerModal to use BarcodeViewfinder**

Read `src/screens/sell/BarcodeScannerModal.tsx`.

Add import:
```tsx
import { BarcodeViewfinder } from '@/components/BarcodeViewfinder';
```

Find the inline viewfinder block (starts with `{/* Viewfinder overlay */}` and ends with `</View>` after `vfBottom`). Replace the entire block with:
```tsx
<BarcodeViewfinder />
```

Remove all the `vf*` style entries from `StyleSheet.create` in this file — they are now in `BarcodeViewfinder.tsx`.

- [ ] **Step 3: Add BarcodeViewfinder to ProductFormScreen camera modal**

Read `src/screens/products/ProductFormScreen.tsx`.

Add import:
```tsx
import { BarcodeViewfinder } from '@/components/BarcodeViewfinder';
```

Find the camera modal JSX. It currently looks like:
```tsx
<Portal>
  <Modal
    visible={cameraVisible}
    onDismiss={() => setCameraVisible(false)}
    contentContainerStyle={StyleSheet.absoluteFillObject}
  >
    <CameraView
      style={StyleSheet.absoluteFillObject}
      onBarcodeScanned={({ data }) => { ... }}
      barcodeScannerSettings={{ ... }}
    />
    <IconButton
      icon="close"
      ...
    />
  </Modal>
</Portal>
```

Add `<BarcodeViewfinder />` between `CameraView` and `IconButton`:
```tsx
<CameraView ... />
<BarcodeViewfinder />
<IconButton ... />
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -20
```

Fix any errors (e.g., leftover `vf*` style references in BarcodeScannerModal that weren't removed).

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari"
git add src/components/BarcodeViewfinder.tsx src/screens/sell/BarcodeScannerModal.tsx src/screens/products/ProductFormScreen.tsx
git commit -m "feat(products): add barcode viewfinder overlay to product camera modal; extract shared BarcodeViewfinder component"
```

---

### Task 3: Descriptive Duplicate Barcode Error

**Spec:** Feature 3 in `docs/superpowers/specs/2026-05-16-sell-product-ux-design.md`

**Files:**
- Modify: `src/screens/products/ProductFormScreen.tsx`

**Context:**
- `products.barcode` has `UNIQUE` constraint (defined in v1 schema)
- SQLite constraint violation produces an `Error` with message containing `"UNIQUE constraint failed: products.barcode"`
- `handleSave` currently calls `Alert.alert('Error', 'Could not save product. Please try again.')` in the catch block
- Read the file before editing

**No tests needed** — the existing test suite already validates the DB-level uniqueness; this is a UI error message change.

- [ ] **Step 1: Update handleSave catch block**

Read `src/screens/products/ProductFormScreen.tsx`.

Find the `handleSave` function's catch block:
```tsx
} catch (e) {
  Alert.alert('Error', 'Could not save product. Please try again.');
}
```

Replace with:
```tsx
} catch (e) {
  const isDuplicateBarcode =
    e instanceof Error && e.message.includes('UNIQUE constraint failed: products.barcode');
  Alert.alert(
    'Error',
    isDuplicateBarcode
      ? 'This barcode is already used by another product.'
      : 'Could not save product. Please try again.',
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari"
git add src/screens/products/ProductFormScreen.tsx
git commit -m "fix(products): show descriptive error when saving a duplicate barcode"
```

---

### Task 4: ROI Scanning — Restrict Camera to Viewfinder Frame

**Spec:** Feature 4 in `docs/superpowers/specs/2026-05-16-sell-product-ux-design.md`

**Files:**
- Modify: `src/screens/sell/BarcodeScannerModal.tsx`
- Modify: `src/screens/products/ProductFormScreen.tsx`

**Context:**
- Must be implemented AFTER Task 2 (which restructured the camera containers in both files)
- Read both files before editing
- The viewfinder rectangle is always 260×120, centered in the camera container
- `cornerPoints` from `BarcodeScannedEvent` gives the corners of the detected barcode in the camera preview's local coordinate space
- Use `onLayout` on the camera container to measure its pixel dimensions
- ROI check: compute average of all corner points → if center is outside viewfinder rect → return early
- Safe fallback: if `cornerPoints` is empty OR layout not yet measured → allow the scan

**No tests needed** — device hardware interaction.

- [ ] **Step 1: Add ROI filter to BarcodeScannerModal**

Read `src/screens/sell/BarcodeScannerModal.tsx`.

**Add `cameraLayoutRef`** after the existing refs:
```tsx
const cameraLayoutRef = useRef<{ width: number; height: number } | null>(null);
```

**Add `onLayout` to the `cameraHalf` View.** Find:
```tsx
<View style={styles.cameraHalf}>
```
Change to:
```tsx
<View
  style={styles.cameraHalf}
  onLayout={(e) => {
    const { width, height } = e.nativeEvent.layout;
    cameraLayoutRef.current = { width, height };
  }}
>
```

**Add ROI filter at the top of `onBarcodeScanned`**, before the `trimmed` guard. The `onBarcodeScanned` callback receives the full event — change its signature to accept the event object so we can access `cornerPoints`:

The full updated handler:
```tsx
onBarcodeScanned={(e) => {
  // ROI filter: ignore scans outside the viewfinder rectangle
  const layout = cameraLayoutRef.current;
  if (layout && e.cornerPoints && e.cornerPoints.length > 0) {
    const cx = e.cornerPoints.reduce((s, p) => s + p.x, 0) / e.cornerPoints.length;
    const cy = e.cornerPoints.reduce((s, p) => s + p.y, 0) / e.cornerPoints.length;
    const vfLeft = (layout.width - 260) / 2;
    const vfTop  = (layout.height - 120) / 2;
    if (cx < vfLeft || cx > vfLeft + 260 || cy < vfTop || cy > vfTop + 120) return;
  }

  const trimmed = e.data.trim();
  if (lastScannedRef.current === trimmed) return;
  lastScannedRef.current = trimmed;

  const product = products.find((p) => p.barcode === trimmed);
  if (!product) {
    setSnackVisible(true);
  } else {
    addItem(product);
    try { beepPlayer.seekTo(0); beepPlayer.play(); } catch {}
  }

  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    lastScannedRef.current = null;
    debounceTimer.current = null;
  }, 3000);
}}
```

Note: `e.data` replaces the destructured `{ data }` parameter since we now need the full event object for `e.cornerPoints`.

- [ ] **Step 2: Add ROI filter to ProductFormScreen camera modal**

Read `src/screens/products/ProductFormScreen.tsx`.

**Add `cameraLayoutRef`** after `scannedRef`:
```tsx
const cameraLayoutRef = useRef<{ width: number; height: number } | null>(null);
```

The camera modal currently wraps `CameraView` in a `Modal` with `contentContainerStyle={StyleSheet.absoluteFillObject}`. The `CameraView` itself fills the modal with `style={StyleSheet.absoluteFillObject}`. We need a container `View` to attach `onLayout` to.

**Wrap CameraView in a layout-measuring container.** Find the camera modal's `Modal` children:
```tsx
<CameraView
  style={StyleSheet.absoluteFillObject}
  onBarcodeScanned={({ data }) => { ... }}
  barcodeScannerSettings={{ ... }}
/>
<BarcodeViewfinder />
<IconButton ... />
```

Replace with:
```tsx
<View
  style={StyleSheet.absoluteFillObject}
  onLayout={(e) => {
    const { width, height } = e.nativeEvent.layout;
    cameraLayoutRef.current = { width, height };
  }}
>
  <CameraView
    style={StyleSheet.absoluteFillObject}
    onBarcodeScanned={(e) => {
      // ROI filter
      const layout = cameraLayoutRef.current;
      if (layout && e.cornerPoints && e.cornerPoints.length > 0) {
        const cx = e.cornerPoints.reduce((s, p) => s + p.x, 0) / e.cornerPoints.length;
        const cy = e.cornerPoints.reduce((s, p) => s + p.y, 0) / e.cornerPoints.length;
        const vfLeft = (layout.width - 260) / 2;
        const vfTop  = (layout.height - 120) / 2;
        if (cx < vfLeft || cx > vfLeft + 260 || cy < vfTop || cy > vfTop + 120) return;
      }
      if (scannedRef.current) return;
      scannedRef.current = true;
      setBarcode(e.data);
      setCameraVisible(false);
    }}
    barcodeScannerSettings={{
      barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr'],
    }}
  />
  <BarcodeViewfinder />
</View>
<IconButton
  icon="close"
  iconColor="white"
  size={32}
  style={styles.cameraClose}
  onPress={() => setCameraVisible(false)}
/>
```

Note: The `IconButton` is moved outside the layout container so it sits above everything (Portal stacking order is fine for this).

- [ ] **Step 3: TypeScript check**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -30
```

The `cornerPoints` property should be available on `BarcodeScannedEvent` from `expo-camera`. If TypeScript complains about `cornerPoints` not existing on the event type, check the expo-camera type definitions:
```bash
grep -r "cornerPoints" "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari/node_modules/expo-camera/build" 2>/dev/null | head -5
```

If `cornerPoints` is not in the type, use `(e as any).cornerPoints` as a fallback and add a comment explaining why.

- [ ] **Step 4: Run tests**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx jest 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari"
git add src/screens/sell/BarcodeScannerModal.tsx src/screens/products/ProductFormScreen.tsx
git commit -m "feat(sell,products): restrict barcode scanning to viewfinder frame (ROI filter)"
```
