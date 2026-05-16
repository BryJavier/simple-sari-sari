# Sell & Product UX — Design Spec

> **Date:** 2026-05-16
> **Scope:** Four targeted UX improvements across the Sell tab and Products tab. No schema changes.

---

## Feature 1 — Beep on Product Tap in Sell Tab

### Problem
The beep sound currently only plays during barcode scanning (inside `BarcodeScannerModal`). When a user taps a product tile in the catalog grid to add it to the cart, there is no audio feedback — making it easy to accidentally double-tap or miss a tap.

### Fix
Play the same beep sound (`assets/sounds/beep.wav`) in `SellScreen` whenever a product is tapped (i.e., `addItem` is called via the catalog `onPress` handler).

### Approach
- Add `useAudioPlayer(require('../../assets/sounds/beep.wav'))` in `SellScreen`
- Wrap the `CatalogGrid` `onPress` handler: call `addItem(p)`, then `beepPlayer.seekTo(0); beepPlayer.play()`
- The sound is initialised once per `SellScreen` mount and shared across all product taps
- Errors are swallowed silently (same pattern as in `BarcodeScannerModal`)

### Constraints
- `BarcodeScannerModal` already has its own `useAudioPlayer` instance — these are independent; both load the same asset but do not share a player object
- No changes to `CatalogGrid`, `ProductTile`, or the cart store

---

## Feature 2 — Barcode Viewfinder in Products Tab Camera

### Problem
`ProductFormScreen` has a full-screen camera modal for scanning barcodes when adding/editing products. It shows only the raw camera preview with a close button — no visual guide for where to position the barcode.

### Fix
Add the same viewfinder overlay used in `BarcodeScannerModal` (dark mask + 260×120 transparent cutout + corner brackets + "Point at barcode" label).

### Approach — Shared Component
Extract the viewfinder JSX into a reusable `BarcodeViewfinder` component at `src/components/BarcodeViewfinder.tsx`. It takes no props — dimensions are fixed (260×120) and styling is self-contained.

**Usage:**
- `BarcodeScannerModal` — replace the inline viewfinder JSX with `<BarcodeViewfinder />`
- `ProductFormScreen` camera modal — add `<BarcodeViewfinder />` as a sibling of `CameraView`, inside the same `absoluteFillObject` container

The component renders a `View` with `StyleSheet.absoluteFillObject` and `pointerEvents="none"`, identical to the current inline implementation in `BarcodeScannerModal`.

---

## Feature 3 — Descriptive Duplicate Barcode Error

### Problem
The `products.barcode` column has a `UNIQUE` constraint (defined in `v1Schema`). When `createProduct` or `updateProduct` is called with a barcode that already exists on another product, SQLite throws a constraint error with the message: `UNIQUE constraint failed: products.barcode`. The current `handleSave` in `ProductFormScreen` catches this generically and shows "Could not save product. Please try again." — which gives the user no actionable information.

### Fix
In `handleSave`, inspect the caught error before falling back to the generic message:

```
if error.message includes "UNIQUE constraint failed: products.barcode"
  → show: "This barcode is already used by another product."
else
  → show: "Could not save product. Please try again."
```

### Constraints
- No changes to `createProduct` or `updateProduct` — the error is caught at the screen level
- The check is a simple `instanceof Error && e.message.includes('UNIQUE constraint failed: products.barcode')`

---

## Feature 4 — ROI Scanning: Restrict Camera to Viewfinder Frame

### Problem
`CameraView` from `expo-camera` scans the full camera frame. Barcodes detected anywhere in frame trigger a scan, even if they are not inside the viewfinder rectangle. This is confusing because the visual guide implies only the framed area is scanned.

### Fix
Add JavaScript-side ROI (Region of Interest) filtering. When a barcode is detected, compute its center point from `cornerPoints` (provided by the `BarcodeScannedEvent`) and check whether it falls within the viewfinder rectangle. If it does not, ignore the scan event.

### Coordinate system
`cornerPoints` from `onBarcodeScanned` are in the camera preview's local coordinate space, which matches the rendered size of the `CameraView` container (as measured by `onLayout`). The viewfinder rectangle is centered in that container at fixed dimensions (260×120).

**ROI filter logic:**
```
cameraLayout  = { width, height }  ← from onLayout on the camera container View
vfLeft        = (cameraLayout.width  - 260) / 2
vfTop         = (cameraLayout.height - 120) / 2
vfRight       = vfLeft + 260
vfBottom      = vfTop  + 120

barcodeCenter = average of cornerPoints (x, y)

if barcodeCenter.x < vfLeft  OR barcodeCenter.x > vfRight  OR
   barcodeCenter.y < vfTop   OR barcodeCenter.y > vfBottom
  → return (ignore scan)
```

**Implementation details:**
- Track camera container layout in a `cameraLayoutRef = useRef<{width:number,height:number}|null>(null)`
- Add `onLayout` to the camera container `View` that populates `cameraLayoutRef`
- The filter runs at the top of `onBarcodeScanned`, before the last-scanned guard
- If `cornerPoints` is empty or `cameraLayoutRef` is null (layout not yet measured), allow the scan through as a safe fallback

### Applies to
- `BarcodeScannerModal` — camera container is `cameraHalf` (flex: 1, top half of the screen)
- `ProductFormScreen` camera modal — camera container is the full-screen `absoluteFillObject` View that wraps `CameraView`

### Known limitation
On some Android devices, the camera sensor coordinate space may differ from the display coordinate space (e.g., rotated by 90°). Testing on the target device is recommended. The safe fallback (allow scan if layout not measured or no corner points) prevents the filter from blocking scans entirely on affected devices.

---

## Files Affected

| File | Change |
|------|--------|
| `src/screens/sell/SellScreen.tsx` | Add `useAudioPlayer`, play beep on product tap |
| `src/components/BarcodeViewfinder.tsx` | **New** — shared viewfinder overlay component |
| `src/screens/sell/BarcodeScannerModal.tsx` | Replace inline viewfinder JSX with `<BarcodeViewfinder />`; add ROI filter |
| `src/screens/products/ProductFormScreen.tsx` | Add `<BarcodeViewfinder />` to camera modal; descriptive barcode error; ROI filter |

No DB migrations, no new navigation routes, no store changes.

---

## Testing

- **Feature 1:** Tap any product tile → beep sound plays; cart increments.
- **Feature 2:** Open product form → tap "Choose" → "Scan with camera" → camera modal shows viewfinder overlay with corner brackets.
- **Feature 3:** Add a product with barcode "123". Edit a second product and set barcode to "123" → save → error shows "This barcode is already used by another product."
- **Feature 4:** Open scanner modal. Hold a barcode clearly outside the viewfinder frame → no scan triggers. Move barcode into the frame → scan triggers.
