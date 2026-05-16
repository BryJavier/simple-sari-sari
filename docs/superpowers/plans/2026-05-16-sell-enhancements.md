# Sell Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three UX improvements — barcode scan sound, quantity editing in scanner cart, and search bar in Sell tab.

**Architecture:** Three independent tasks. Tasks 1 and 2 both touch `BarcodeScannerModal` — implement Task 1 first, then Task 2 on the updated file. Task 3 is fully independent.

**Tech Stack:** React Native 0.83.6, Expo SDK 55, TypeScript strict, react-native-paper, Zustand cart store, expo-av (new dependency).

---

### Task 1: Barcode Scan Sound

**Spec:** Feature 1 in `docs/superpowers/specs/2026-05-16-sell-enhancements-design.md`

**Files:**
- Modify: `package.json` (via `npx expo install expo-av`)
- Create: `assets/sounds/beep.wav`
- Modify: `src/screens/sell/BarcodeScannerModal.tsx`

**No unit tests needed** — audio playback cannot be meaningfully unit tested.

- [ ] **Step 1: Install expo-av**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari"
npx expo install expo-av
```

Expected: `expo-av` added to `package.json` and installed to `node_modules`.

- [ ] **Step 2: Create the beep sound asset**

Create the `assets/sounds/` directory and generate a minimal beep WAV file using this Python script:

```bash
python3 - <<'EOF'
import struct, math

SAMPLE_RATE = 44100
DURATION = 0.12       # 120 ms
FREQUENCY = 1000      # 1 kHz beep
AMPLITUDE = 0.5

num_samples = int(SAMPLE_RATE * DURATION)
samples = []
for i in range(num_samples):
    t = i / SAMPLE_RATE
    # fade in/out to avoid clicks (10 ms each)
    fade_samples = int(SAMPLE_RATE * 0.01)
    if i < fade_samples:
        env = i / fade_samples
    elif i > num_samples - fade_samples:
        env = (num_samples - i) / fade_samples
    else:
        env = 1.0
    sample = int(AMPLITUDE * env * math.sin(2 * math.pi * FREQUENCY * t) * 32767)
    samples.append(struct.pack('<h', max(-32768, min(32767, sample))))

audio_data = b''.join(samples)
data_size = len(audio_data)
chunk_size = 36 + data_size

import os
os.makedirs('/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari/assets/sounds', exist_ok=True)

with open('/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari/assets/sounds/beep.wav', 'wb') as f:
    # RIFF header
    f.write(b'RIFF')
    f.write(struct.pack('<I', chunk_size))
    f.write(b'WAVE')
    # fmt chunk
    f.write(b'fmt ')
    f.write(struct.pack('<I', 16))       # chunk size
    f.write(struct.pack('<H', 1))        # PCM format
    f.write(struct.pack('<H', 1))        # mono
    f.write(struct.pack('<I', SAMPLE_RATE))
    f.write(struct.pack('<I', SAMPLE_RATE * 2))  # byte rate
    f.write(struct.pack('<H', 2))        # block align
    f.write(struct.pack('<H', 16))       # bits per sample
    # data chunk
    f.write(b'data')
    f.write(struct.pack('<I', data_size))
    f.write(audio_data)

print('beep.wav created')
EOF
```

Expected: `assets/sounds/beep.wav` created (~10 KB).

- [ ] **Step 3: Add sound playback to BarcodeScannerModal**

Read `src/screens/sell/BarcodeScannerModal.tsx` first.

Add `Audio` import from `expo-av`:
```tsx
import { Audio } from 'expo-av';
```

Add a sound ref after the existing refs (after `onDismissRef`):
```tsx
const soundRef = useRef<Audio.Sound | null>(null);
```

Add a mount/unmount effect to load and unload the sound. Place it after the `onDismissRef` effect:
```tsx
useEffect(() => {
  let mounted = true;
  Audio.setAudioModeAsync({ playsInSilentModeIOS: false }).catch(() => {});
  Audio.Sound.createAsync(require('../../../assets/sounds/beep.wav'))
    .then(({ sound }) => {
      if (mounted) soundRef.current = sound;
    })
    .catch(() => {}); // silent failure if asset missing or device restricted

  return () => {
    mounted = false;
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
  };
}, []);
```

In `onBarcodeScanned`, after `addItem(product)` (the found path only), add:
```tsx
soundRef.current?.replayAsync().catch(() => {});
```

Full updated `onBarcodeScanned` handler:
```tsx
onBarcodeScanned={({ data }) => {
  const trimmed = data.trim();
  if (lastScannedRef.current === trimmed) return;
  lastScannedRef.current = trimmed;

  const product = products.find((p) => p.barcode === trimmed);
  if (!product) {
    setSnackVisible(true);
  } else {
    addItem(product);
    soundRef.current?.replayAsync().catch(() => {});
  }

  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    lastScannedRef.current = null;
    debounceTimer.current = null;
  }, 3000);
}}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If `expo-av` types are missing, run `npx expo install expo-av` again to ensure types are installed.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari"
git add assets/sounds/beep.wav src/screens/sell/BarcodeScannerModal.tsx package.json package-lock.json
git commit -m "feat(sell): play beep sound on successful barcode scan"
```

---

### Task 2: Quantity Editing in Scanner Cart Rows

**Spec:** Feature 2 in `docs/superpowers/specs/2026-05-16-sell-enhancements-design.md`

**Files:**
- Modify: `src/screens/sell/BarcodeScannerModal.tsx`

**Context:**
- Cart store already has `incrementItem(productId)` and `decrementItem(productId)` (decrementItem removes item at qty 0)
- `BarcodeScannerModal` already imports `IconButton` from react-native-paper
- The bottom `cartHalf` currently renders rows with product name, price×qty detail, and a total — all read-only
- Read the file before editing (Task 1 may have changed it)

**No unit tests needed** — UI wiring of existing store actions.

- [ ] **Step 1: Add cart store actions to BarcodeScannerModal**

Read `src/screens/sell/BarcodeScannerModal.tsx`.

Add `incrementItem` and `decrementItem` to the Zustand subscriptions (after the existing `addItem` line):
```tsx
const incrementItem = useCartStore((s) => s.incrementItem);
const decrementItem = useCartStore((s) => s.decrementItem);
```

- [ ] **Step 2: Replace read-only cart rows with interactive rows**

Find the `{items.map((item) => (...))}` block inside the `<ScrollView>`. Replace the entire map with:

```tsx
{items.map((item) => (
  <View key={item.product.id} style={styles.cartRow}>
    <Text style={styles.cartItemName} numberOfLines={1}>
      {item.product.name}
    </Text>
    <View style={styles.cartQtyRow}>
      <IconButton
        icon="minus"
        size={16}
        iconColor={palette.text}
        onPress={() => decrementItem(item.product.id)}
      />
      <Text style={styles.cartQtyText}>{item.quantity}</Text>
      <IconButton
        icon="plus"
        size={16}
        iconColor={palette.text}
        onPress={() => incrementItem(item.product.id)}
      />
    </View>
    <Text style={styles.cartItemTotal}>
      {formatMoney(item.product.price_centavos * item.quantity)}
    </Text>
  </View>
))}
```

- [ ] **Step 3: Update cartRow styles**

The current `cartRow` and `cartRowInfo` styles need updating. Replace them in `StyleSheet.create`:

Current:
```tsx
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
```

Replace with:
```tsx
cartRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingLeft: 16,
  paddingRight: 4,
  borderBottomWidth: 1,
  borderBottomColor: palette.borderLight,
},
cartItemName: { flex: 1, fontSize: 13, fontWeight: '600', color: palette.text },
cartQtyRow: { flexDirection: 'row', alignItems: 'center' },
cartQtyText: { fontSize: 13, fontWeight: '600', color: palette.text, minWidth: 20, textAlign: 'center' },
```

Remove `cartRowInfo` and `cartItemDetail` — they are no longer used.

- [ ] **Step 4: TypeScript check**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If `cartItemDetail` is still referenced somewhere, remove the remaining reference.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari"
git add src/screens/sell/BarcodeScannerModal.tsx
git commit -m "feat(sell): add quantity controls to scanner modal cart rows"
```

---

### Task 3: Search Bar in Sell Tab

**Spec:** Feature 3 in `docs/superpowers/specs/2026-05-16-sell-enhancements-design.md`

**Files:**
- Modify: `src/screens/sell/SellScreen.tsx`
- Modify: `src/screens/sell/CatalogGrid.tsx`

**Context:**
- `SellScreen` holds `products: Product[]` state, refreshed on tab focus via `useFocusEffect`
- `CatalogGrid` receives `products` as a prop and renders them in a `FlatList`
- react-native-paper's `Searchbar` component has built-in clear button when `value` is non-empty
- Filtering is client-side — no new DB queries

**No unit tests needed** — filtering logic is trivial; no store or DB involvement.

- [ ] **Step 1: Add search state and filtered products to SellScreen**

Read `src/screens/sell/SellScreen.tsx`.

Add `Searchbar` to the react-native-paper import:
```tsx
import { Appbar, Searchbar } from 'react-native-paper';
```

Add state after the existing state declarations:
```tsx
const [searchQuery, setSearchQuery] = useState('');
```

Derive filtered products (add this just before the `return` statement):
```tsx
const filteredProducts = searchQuery.trim()
  ? products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
    )
  : products;
```

- [ ] **Step 2: Render Searchbar in SellScreen**

Inside the `main` View (currently contains `<TodayCards />` and `<CatalogGrid />`), add the Searchbar between them:

```tsx
<View style={styles.main}>
  <TodayCards refreshKey={summaryKey} />
  <Searchbar
    placeholder="Search products..."
    value={searchQuery}
    onChangeText={setSearchQuery}
    style={styles.searchBar}
    inputStyle={styles.searchInput}
  />
  <CatalogGrid
    products={filteredProducts}
    onPress={(p) => addItem(p)}
    onLongPress={(p) => setPreviewProduct(p)}
  />
</View>
```

Add styles:
```tsx
searchBar: {
  marginHorizontal: 8,
  marginBottom: 4,
  elevation: 0,
  backgroundColor: palette.card,
},
searchInput: { fontSize: 14 },
```

- [ ] **Step 3: Add empty state to CatalogGrid**

Read `src/screens/sell/CatalogGrid.tsx`.

Add `ListEmptyComponent` to the `FlatList`:
```tsx
ListEmptyComponent={
  <Text
    variant="bodyMedium"
    style={{ textAlign: 'center', color: palette.text3, padding: 32 }}
  >
    No products found
  </Text>
}
```

Add the `Text` import from react-native-paper and `palette` import if not already present:
```tsx
import { Text } from 'react-native-paper';
import { palette } from '@/theme/palette';
```

Full updated `CatalogGrid.tsx`:
```tsx
import { FlatList, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ProductTile } from './ProductTile';
import { useSettingsStore } from '@/store/settings';
import { useIsTablet } from '@/utils/layout';
import { DENSITY_COLUMNS } from '@/theme/types';
import { palette } from '@/theme/palette';
import type { Product } from '@/db/types';

interface CatalogGridProps {
  products: Product[];
  onPress: (product: Product) => void;
  onLongPress: (product: Product) => void;
}

export function CatalogGrid({ products, onPress, onLongPress }: CatalogGridProps) {
  const density = useSettingsStore((s) => s.density);
  const isTablet = useIsTablet();
  const numColumns = DENSITY_COLUMNS[density][isTablet ? 'tablet' : 'phone'];

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => String(item.id)}
      numColumns={numColumns}
      key={numColumns}
      contentContainerStyle={{ padding: 4 }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 / numColumns }}>
          <ProductTile
            product={item}
            density={density}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        </View>
      )}
      ListEmptyComponent={
        <Text
          variant="bodyMedium"
          style={{ textAlign: 'center', color: palette.text3, padding: 32 }}
        >
          No products found
        </Text>
      }
    />
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx jest 2>&1 | tail -10
```

Expected: all tests pass (no test changes needed — new logic is pure client-side filtering).

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari"
git add src/screens/sell/SellScreen.tsx src/screens/sell/CatalogGrid.tsx
git commit -m "feat(sell): add product search bar to catalog"
```
