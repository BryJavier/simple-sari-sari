# Sell UX Bug Fixes — Design Spec

> **Date:** 2026-05-16
> **Scope:** Four targeted bug fixes discovered during device testing. No new features, no schema changes.

---

## Overview

Four UX bugs identified in the Sell tab and Add Product flow. Each fix is isolated and non-breaking.

---

## Bug 1 — Cart View/Edit on Phone

### Problem
On phone (non-tablet), `CartBar` shows item count + total + Pay button but is not tappable to view or edit cart contents. The only way to remove an item is to tap the same product again (which increments, not removes). There is no way to decrease quantity or clear individual items from the Sell tab on phone.

Tablet already has `CartPane` (a side panel with +/− quantity controls per item). Phone has no equivalent.

### Fix
Make the left portion of `CartBar` (item count + total text) tappable to open a `CartSheet` bottom modal.

**`CartSheet.tsx`** — new file, modal that shows:
- A scrollable list of cart items with the same `−/+` quantity controls as `CartPane` (using `decrementItem` and `incrementItem` from the cart store; `decrementItem` already removes the item when quantity hits 0)
- Total row at the bottom
- "Pay" button that dismisses the sheet and opens PaySheet
- "Continue shopping" text link that just dismisses the sheet

**`CartBar`** — add optional `onViewCart?: () => void` prop. Wrap the count + total `Text` elements in a `Pressable` that calls `onViewCart`. The "Pay" button keeps its existing behavior.

**`SellScreen`** — add `cartSheetVisible` state. Pass `onViewCart={() => setCartSheetVisible(true)}` to `CartBar`. Render `<CartSheet>` alongside the other modals. Pass `onPay` to CartSheet so the Pay button opens PaySheet correctly.

### Constraints
- Cart store already has all required actions: `incrementItem`, `decrementItem`, `removeItem`, `clearCart`
- `CartPane` already shows the same UX pattern for tablet — CartSheet is the phone equivalent delivered as a modal
- CartSheet does not replace CartPane; both coexist

---

## Bug 2 — Barcode Viewfinder Overlay

### Problem
`BarcodeScannerModal` shows a live `CameraView` with no visual guide. Users don't know where to position the barcode.

### Fix
Add a viewfinder overlay directly on top of the `CameraView` inside `cameraHalf`. The overlay uses `StyleSheet.absoluteFillObject` and is composed of:

- **Dark mask** with a transparent cutout: four dark semi-transparent strips (top, left, right, bottom) surrounding a centered transparent rectangle (~260 × 120 dp). This dims everything outside the scan zone.
- **Corner brackets**: four small L-shaped decorations at the corners of the transparent rectangle, drawn with `borderColor: white` and partial borders (top+left, top+right, etc.) to form brackets.
- A "Point at barcode" label below the rectangle in white text.

No logic changes — purely visual. The `CameraView` scans the full frame regardless of the overlay; the overlay is only a visual guide.

---

## Bug 3 — Continuous Scan Creates Multiple Entries

### Problem
Current debounce uses `scanningRef: boolean`. It sets the flag `true` on a scan event, then resets it `false` after 800ms. If the barcode stays in frame, another scan fires every 800ms — each one adds another item to the cart.

### Fix
Replace the boolean debounce with a **last-scanned barcode guard** using `lastScannedRef: string | null`.

**Logic:**
1. On `onBarcodeScanned({ data })`: if `lastScannedRef.current === data`, skip entirely (same barcode still in frame).
2. Otherwise: set `lastScannedRef.current = data`, process the scan (add item or show Snackbar).
3. After 3 seconds, reset `lastScannedRef.current = null`. This allows the same barcode to be re-scanned intentionally.

**Behavior change:**
- Same barcode held in frame: adds once, ignores until the 3s window expires or a different barcode appears.
- Different barcode immediately in frame: processes immediately (ref is a different value).
- Intentional re-scan of same barcode: works after 3s.

Remove `scanningRef` and the existing 800ms timer pattern. The 3s timer replaces both.

**Cleanup on modal close** (already handled by `visible` effect): clear the pending timer and reset `lastScannedRef.current = null`.

---

## Bug 4 — Keyboard Overlaps BarcodeChooserSheet

### Problem
In `ProductFormScreen`, pressing the "Choose" button for the barcode field opens `BarcodeChooserSheet` as a `Portal`/`Modal`. If any `TextInput` (name, price, cost) had focus, the software keyboard stays up and visually overlaps the sheet options.

### Fix
Call `Keyboard.dismiss()` immediately before `setBarcodeChooserVisible(true)` in the "Choose" button's `onPress` handler.

```tsx
// ProductFormScreen.tsx — barcodeRow Choose button
onPress={() => {
  Keyboard.dismiss();
  setBarcodeChooserVisible(true);
}}
```

`Keyboard` is imported from `react-native` (already imported in the file). One-line change.

---

## Files Affected

| File | Change |
|------|--------|
| `src/screens/sell/CartBar.tsx` | Add `onViewCart?` prop; wrap count+total in Pressable |
| `src/screens/sell/CartSheet.tsx` | **New** — cart view/edit bottom modal |
| `src/screens/sell/SellScreen.tsx` | Add `cartSheetVisible` state; render CartSheet |
| `src/screens/sell/BarcodeScannerModal.tsx` | Add viewfinder overlay; replace scan guard with last-barcode ref |
| `src/screens/products/ProductFormScreen.tsx` | Add `Keyboard.dismiss()` before opening BarcodeChooserSheet |

No DB migrations, no new queries, no new navigation routes.

---

## Testing

- **Bug 1:** Add item to cart → tap count/total area → CartSheet opens showing item → tap − to reduce → item removed → sheet reflects change in real time.
- **Bug 2:** Open scanner modal → viewfinder rectangle and corner brackets visible over camera preview.
- **Bug 3:** Hold camera on barcode for 5+ seconds → only one item added. Move to different barcode → adds correctly. Return to first barcode after 3s → adds again.
- **Bug 4:** Focus name field in ProductFormScreen → tap "Choose" → keyboard dismisses and BarcodeChooserSheet options are fully visible.
