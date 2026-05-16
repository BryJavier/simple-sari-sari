# Sell Enhancements — Design Spec

> **Date:** 2026-05-16
> **Scope:** Three UX improvements to the Sell tab and barcode scanner flow. No schema changes.

---

## Feature 1 — Barcode Scan Sound

### Problem
When the barcode scanner successfully reads a product, the only feedback is the cart list updating. There is no audio confirmation, which makes it easy to miss a scan in a noisy sari-sari store environment.

### Fix
Play a short beep sound whenever a barcode scan successfully matches a product (found path). No sound on the not-found path — the Snackbar toast is sufficient and an error sound would be annoying.

### Approach

**New dependency:** `expo-av` (SDK 55 compatible: `~14.0.x`). Installed via `npx expo install expo-av`.

**Sound asset:** A short (~200ms) beep WAV or MP3 placed at `assets/sounds/beep.wav`. Any public domain beep sound works. The asset is bundled with the app — no network required at runtime.

**Integration in `BarcodeScannerModal`:**
- On mount: load the sound object using `Audio.Sound.createAsync(require('../../assets/sounds/beep.wav'))`
- On successful scan (product found): call `sound.replayAsync()` (handles replaying without re-loading)
- On unmount: call `sound.unloadAsync()` to free resources
- Sound object is stored in a `useRef` so it doesn't cause re-renders

**Volume / mode:** Call `Audio.setAudioModeAsync({ playsInSilentModeIOS: false })` so the sound respects the device's silent switch. On Android, `expo-av` uses the media stream by default.

### Constraints
- Sound only plays on successful product match — not on barcode-not-found
- If the sound fails to load (missing asset, device restriction), the scan still works silently — no crash
- No UI changes to `BarcodeScannerModal`

---

## Feature 2 — Quantity Editing in Scanner Cart View

### Problem
The bottom half of `BarcodeScannerModal` shows cart items as read-only rows (name, price × qty, total). Users can add items by scanning but cannot adjust quantities — they'd have to close the scanner and open CartSheet.

### Fix
Add `−/+` `IconButton` controls to each cart row in the scanner modal's bottom half. Same pattern as `CartSheet` and `CartPane`.

### Approach

**In `BarcodeScannerModal`**, replace the static `cartRow` layout with an interactive row:

Current layout:
```
[name + "₱XX × N"]  |  [total]
```

New layout:
```
[name]  |  [− N +]  |  [total]
```

Wire `decrementItem(product.id)` and `incrementItem(product.id)` from the cart store (already available). `decrementItem` auto-removes the item when quantity reaches 0, so no separate remove button is needed — the user taps `−` until the item disappears.

The cart row uses `IconButton` (from react-native-paper, already imported) for the `−` and `+` buttons with size 16, matching the CartSheet row pattern.

**Row height:** IconButton has built-in padding (~32dp tap target). The row will be taller than before; no fixed height constraint is needed since the ScrollView handles overflow.

### Constraints
- `decrementItem` and `incrementItem` already exist in the cart store — no store changes
- No new imports needed beyond what BarcodeScannerModal already has (`IconButton` from react-native-paper)

---

## Feature 3 — Search Bar in Sell Tab

### Problem
The Sell tab shows all active products in a grid. As product count grows, finding a specific item requires scrolling. There is no way to filter by name.

### Fix
Add a `Searchbar` component (from react-native-paper) between `TodayCards` and `CatalogGrid` in `SellScreen`. Filtering is done client-side on the in-memory `products` array — no new DB query.

### Approach

**In `SellScreen`:**
- Add `searchQuery` state (`useState('')`)
- Derive `filteredProducts` from `products`: filter where `product.name.toLowerCase().includes(searchQuery.trim().toLowerCase())`
- If `searchQuery` is empty, `filteredProducts === products` (no filtering overhead)
- Pass `filteredProducts` to `CatalogGrid` instead of `products`
- Render `<Searchbar>` between `TodayCards` and `CatalogGrid` with `placeholder="Search products..."`, `value={searchQuery}`, `onChangeText={setSearchQuery}`

**Searchbar placement:** Between `TodayCards` and `CatalogGrid`, inside the `main` View. The Searchbar is always visible (not a toggle) — it's a low-profile component and provides instant utility.

**When focus changes (useFocusEffect):** `searchQuery` is NOT reset on tab focus — if the user navigated away and comes back, their search is preserved. Clearing is done via the Searchbar's built-in clear button (react-native-paper's `Searchbar` includes one automatically when `value` is non-empty).

**Empty results:** If no products match, `CatalogGrid` renders an empty FlatList. A short "No products found" empty state should display — add `ListEmptyComponent` to `CatalogGrid`'s FlatList.

### Style
The Searchbar sits inside the main scroll area but is not inside the FlatList header (to avoid scroll-jank). It is rendered as a regular View sibling between `TodayCards` and `CatalogGrid` with `marginHorizontal: 8, marginBottom: 4`.

---

## Files Affected

| File | Change |
|------|--------|
| `package.json` / `package-lock.json` | Add `expo-av` dependency |
| `assets/sounds/beep.wav` | **New** — bundled beep sound asset |
| `src/screens/sell/BarcodeScannerModal.tsx` | Load + play beep on match; add −/+ controls to cart rows |
| `src/screens/sell/SellScreen.tsx` | Add `searchQuery` state, `filteredProducts`, render Searchbar |
| `src/screens/sell/CatalogGrid.tsx` | Add `ListEmptyComponent` to FlatList |

No DB migrations, no new navigation routes, no Zustand store changes.

---

## Testing

- **Sound:** Open scanner, scan a known product barcode → beep heard. Scan an unknown barcode → no beep, Snackbar shows.
- **Quantity edit:** Scan a product → it appears in bottom cart list with −/+ buttons. Tap + → quantity increments. Tap − to 0 → item removed from list.
- **Search:** Sell tab → type partial product name → grid filters in real time. Clear → full catalog returns. Type something with no match → "No products found" message.
