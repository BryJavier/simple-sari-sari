# Phase 3: Products Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete product catalog management flow: searchable list, add/edit form, soft archive, and barcode management (manual entry, camera scan, EAN-13 generation with SVG display and share).

**Architecture:** One new screen (`ProductFormScreen`) is added to the Products tab stack alongside the real `ProductListScreen`. Camera scanning runs as a Portal modal inside `ProductFormScreen` — no new stack screen needed, which avoids navigation-param callback headaches. Two modal sheets (`BarcodeChooserSheet`, `BarcodeDisplaySheet`) compose into `ProductFormScreen` via visible-state props. Barcode logic lives in two focused units: `src/utils/barcode.ts` (pure EAN-13 math) and `src/screens/products/EAN13Barcode.tsx` (react-native-svg renderer). Sharing serializes the barcode to an SVG string written to disk by `expo-file-system`, then handed to `expo-sharing` — no native screenshot library required.

**Tech Stack:** expo-camera v15 (barcode scanning via CameraView), react-native-svg (SVG rendering), expo-file-system + expo-sharing (SVG share), react-native-paper v5 (Searchbar, List.Item, FAB, Dialog, Modal/Portal, TextInput, Button, IconButton, Divider), React Navigation v6, TypeScript strict.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app.json` | Modify | Add `expo-camera` plugin |
| `src/db/queries/products.ts` | Modify | Add `getProduct`, `createProduct`, `updateProduct`, `archiveProduct` |
| `src/__tests__/db/queries/products.test.ts` | Modify | Tests for the four new query functions |
| `src/utils/barcode.ts` | Create | `generateEAN13`, `ean13CheckDigit`, `isValidEAN13`, `ean13ToBars`, `generateBarcodeSVGString` |
| `src/__tests__/utils/barcode.test.ts` | Create | TDD tests for all barcode utilities |
| `src/screens/products/EAN13Barcode.tsx` | Create | react-native-svg barcode component (no tests — pure UI) |
| `src/navigation/types.ts` | Modify | Add `ProductForm: { productId?: number }` to `ProductsStackParamList` |
| `src/navigation/ProductsStack.tsx` | Modify | Register `ProductFormScreen` |
| `src/screens/products/ProductListScreen.tsx` | Modify | Real list: Searchbar, FlatList, FAB, focus-refresh |
| `src/screens/products/ProductFormScreen.tsx` | Create | Add/edit form + archive Dialog + camera Portal modal |
| `src/screens/products/BarcodeChooserSheet.tsx` | Create | Options modal: manual entry, scan, generate |
| `src/screens/products/BarcodeDisplaySheet.tsx` | Create | SVG barcode view + share button |

---

## Task 1: Install packages and update app.json

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Install expo-camera, react-native-svg, expo-file-system, expo-sharing**

Run each command; `npx expo install` resolves the version compatible with the current Expo SDK:

```bash
npx expo install expo-camera
npx expo install react-native-svg
npx expo install expo-file-system
npx expo install expo-sharing
```

Expected: each command prints "Installing X packages" and completes without error. `package.json` now lists all four.

- [ ] **Step 2: Verify installation**

```bash
node -e "const p = require('./package.json'); ['expo-camera','react-native-svg','expo-file-system','expo-sharing'].forEach(d => console.log(d, p.dependencies[d] ?? 'MISSING'))"
```

Expected: four lines each showing a version string (not MISSING).

- [ ] **Step 3: Add expo-camera plugin to app.json**

Read the current `app.json`. The `plugins` array currently contains `["expo-sqlite", "expo-font"]`. Add `"expo-camera"` to it:

```json
{
  "expo": {
    "plugins": ["expo-sqlite", "expo-font", "expo-camera"]
  }
}
```

Leave all other fields unchanged.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore(products): install expo-camera, react-native-svg, expo-file-system, expo-sharing"
```

> **Note:** The new native modules (expo-camera, react-native-svg) require a full Android rebuild before they work on-device. The rebuild happens during the smoke test in Task 10.

---

## Task 2: Product DB query additions (TDD)

**Files:**
- Modify: `src/db/queries/products.ts`
- Modify: `src/__tests__/db/queries/products.test.ts`

The existing file already exports `listActiveProducts` and `seedSampleProducts`. This task adds four more functions and their tests.

- [ ] **Step 1: Write the failing tests**

Open `src/__tests__/db/queries/products.test.ts`. The file currently imports and tests `listActiveProducts` and `seedSampleProducts`. Add the following imports at the top and new `describe` blocks at the bottom (leave existing tests untouched):

```ts
// Add to the existing imports line:
import {
  listActiveProducts,
  seedSampleProducts,
  getProduct,
  createProduct,
  updateProduct,
  archiveProduct,
} from '@/db/queries/products';
import { todayISO } from '@/utils/date';
```

Replace the current import of `listActiveProducts, seedSampleProducts` with the expanded import above.

Then add these describe blocks **after** the existing ones:

```ts
describe('createProduct', () => {
  it('inserts a product and returns its id', async () => {
    const id = await createProduct(db, {
      name: 'Chippy Corn Chips',
      price_centavos: 1500,
      cost_centavos: 1000,
      barcode: null,
    });
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('inserted product appears in listActiveProducts', async () => {
    await createProduct(db, {
      name: 'Test Item',
      price_centavos: 500,
      cost_centavos: null,
      barcode: '1234567890128',
    });
    const products = await listActiveProducts(db);
    expect(products.some((p) => p.name === 'Test Item')).toBe(true);
  });

  it('sets is_generated to 0', async () => {
    const id = await createProduct(db, {
      name: 'Manual Item',
      price_centavos: 200,
      cost_centavos: null,
      barcode: null,
    });
    const product = await getProduct(db, id);
    expect(product?.is_generated).toBe(0);
  });

  it('rejects duplicate barcode', async () => {
    await createProduct(db, {
      name: 'First',
      price_centavos: 100,
      cost_centavos: null,
      barcode: 'UNIQUE123',
    });
    await expect(
      createProduct(db, {
        name: 'Second',
        price_centavos: 200,
        cost_centavos: null,
        barcode: 'UNIQUE123',
      }),
    ).rejects.toThrow();
  });
});

describe('getProduct', () => {
  it('returns the product for a known id', async () => {
    const id = await createProduct(db, {
      name: 'Lucky Me',
      price_centavos: 1300,
      cost_centavos: 900,
      barcode: null,
    });
    const product = await getProduct(db, id);
    expect(product).toBeDefined();
    expect(product?.name).toBe('Lucky Me');
    expect(product?.price_centavos).toBe(1300);
    expect(product?.cost_centavos).toBe(900);
  });

  it('returns undefined for a missing id', async () => {
    expect(await getProduct(db, 99999)).toBeUndefined();
  });
});

describe('updateProduct', () => {
  it('changes name, price, cost, and barcode', async () => {
    const id = await createProduct(db, {
      name: 'Old Name',
      price_centavos: 100,
      cost_centavos: null,
      barcode: null,
    });
    await updateProduct(db, id, {
      name: 'New Name',
      price_centavos: 200,
      cost_centavos: 150,
      barcode: '9780000000002',
    });
    const product = await getProduct(db, id);
    expect(product?.name).toBe('New Name');
    expect(product?.price_centavos).toBe(200);
    expect(product?.cost_centavos).toBe(150);
    expect(product?.barcode).toBe('9780000000002');
  });

  it('can clear cost and barcode by setting them to null', async () => {
    const id = await createProduct(db, {
      name: 'Item',
      price_centavos: 100,
      cost_centavos: 80,
      barcode: '1234567890128',
    });
    await updateProduct(db, id, {
      name: 'Item',
      price_centavos: 100,
      cost_centavos: null,
      barcode: null,
    });
    const product = await getProduct(db, id);
    expect(product?.cost_centavos).toBeNull();
    expect(product?.barcode).toBeNull();
  });
});

describe('archiveProduct', () => {
  it('sets archived_at and removes product from listActiveProducts', async () => {
    const id = await createProduct(db, {
      name: 'To Archive',
      price_centavos: 500,
      cost_centavos: null,
      barcode: null,
    });
    await archiveProduct(db, id);

    const active = await listActiveProducts(db);
    expect(active.some((p) => p.id === id)).toBe(false);

    const product = await getProduct(db, id);
    expect(product?.archived_at).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
npm test -- --testPathPattern="db/queries/products"
```

Expected: FAIL — `createProduct is not a function` (or similar). This confirms the tests are wired correctly.

- [ ] **Step 3: Implement the four new functions in `src/db/queries/products.ts`**

Add the following after the existing exports (keep `listActiveProducts` and `seedSampleProducts` unchanged):

```ts
export async function getProduct(db: Database, id: number): Promise<Product | undefined> {
  return db.get<Product>('SELECT * FROM products WHERE id = ?', [id]);
}

export async function createProduct(
  db: Database,
  input: {
    name: string;
    price_centavos: number;
    cost_centavos: number | null;
    barcode: string | null;
  },
): Promise<number> {
  const now = todayISO();
  const result = await db.run(
    'INSERT INTO products (name, price_centavos, cost_centavos, barcode, is_generated, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [input.name, input.price_centavos, input.cost_centavos, input.barcode, now],
  );
  return result.lastInsertRowid;
}

export async function updateProduct(
  db: Database,
  id: number,
  input: {
    name: string;
    price_centavos: number;
    cost_centavos: number | null;
    barcode: string | null;
  },
): Promise<void> {
  await db.run(
    'UPDATE products SET name = ?, price_centavos = ?, cost_centavos = ?, barcode = ? WHERE id = ?',
    [input.name, input.price_centavos, input.cost_centavos, input.barcode, id],
  );
}

export async function archiveProduct(db: Database, id: number): Promise<void> {
  await db.run('UPDATE products SET archived_at = ? WHERE id = ?', [todayISO(), id]);
}
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
npm test -- --testPathPattern="db/queries/products"
```

Expected: PASS — all tests green (existing + new). The suite should show 3 suites passing with the new tests counted.

- [ ] **Step 5: Run the full suite to check for regressions**

```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/db/queries/products.ts src/__tests__/db/queries/products.test.ts
git commit -m "feat(db): add getProduct, createProduct, updateProduct, archiveProduct queries"
```

---

## Task 3: Barcode utilities (TDD)

**Files:**
- Create: `src/utils/barcode.ts`
- Create: `src/__tests__/utils/barcode.test.ts`

EAN-13 background: a 13-digit barcode where the first digit selects a parity pattern for the left 6 digits, followed by a center guard, then 6 right digits, and ending with a computed check digit. Internal-use codes use the prefix range `200–299`, so generated codes will never clash with real retail barcodes.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/utils/barcode.test.ts`:

```ts
import {
  ean13CheckDigit,
  generateEAN13,
  isValidEAN13,
  ean13ToBars,
  generateBarcodeSVGString,
} from '@/utils/barcode';

describe('ean13CheckDigit', () => {
  it('returns the correct check digit for a known EAN-13', () => {
    // EAN-13: 5901234123457 — check digit is 7
    expect(ean13CheckDigit('590123412345')).toBe(7);
  });

  it('returns 0 when the sum is a multiple of 10', () => {
    // Manually craft a first-12 that produces check digit 0
    // 000000000000 → sum=0 → check=(10-0)%10=0
    expect(ean13CheckDigit('000000000000')).toBe(0);
  });
});

describe('isValidEAN13', () => {
  it('accepts a known valid EAN-13', () => {
    expect(isValidEAN13('5901234123457')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidEAN13('123')).toBe(false);
    expect(isValidEAN13('12345678901234')).toBe(false);
  });

  it('rejects non-digits', () => {
    expect(isValidEAN13('590123412345A')).toBe(false);
  });

  it('rejects a barcode with wrong check digit', () => {
    expect(isValidEAN13('5901234123450')).toBe(false); // should end in 7
  });
});

describe('generateEAN13', () => {
  it('returns a 13-digit string', () => {
    const code = generateEAN13();
    expect(code).toMatch(/^\d{13}$/);
  });

  it('passes isValidEAN13', () => {
    for (let i = 0; i < 10; i++) {
      expect(isValidEAN13(generateEAN13())).toBe(true);
    }
  });

  it('starts with prefix 2 (internal-use range)', () => {
    const code = generateEAN13();
    expect(code[0]).toBe('2');
  });

  it('generates unique codes on consecutive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateEAN13()));
    // Extremely unlikely to generate the same code twice out of 20
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('ean13ToBars', () => {
  it('returns a string of 95 characters', () => {
    // EAN-13 encodes to exactly 95 modules (excluding quiet zones)
    expect(ean13ToBars('5901234123457')).toHaveLength(95);
  });

  it('contains only 0 and 1 characters', () => {
    const bars = ean13ToBars('5901234123457');
    expect(bars).toMatch(/^[01]+$/);
  });

  it('starts with 101 (start guard) and ends with 101 (end guard)', () => {
    const bars = ean13ToBars('5901234123457');
    expect(bars.slice(0, 3)).toBe('101');
    expect(bars.slice(-3)).toBe('101');
  });

  it('contains 01010 center guard at position 45–49', () => {
    const bars = ean13ToBars('5901234123457');
    expect(bars.slice(45, 50)).toBe('01010');
  });
});

describe('generateBarcodeSVGString', () => {
  it('returns a string containing an SVG root element', () => {
    const svg = generateBarcodeSVGString('5901234123457');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('includes the barcode value as text', () => {
    const svg = generateBarcodeSVGString('5901234123457');
    expect(svg).toContain('5901234123457');
  });

  it('includes rect elements for the bars', () => {
    const svg = generateBarcodeSVGString('5901234123457');
    expect(svg).toContain('<rect');
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
npm test -- --testPathPattern="utils/barcode"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/barcode.ts`**

```ts
const L_TABLE = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];
const G_TABLE = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];
const R_TABLE = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
];
// Parity pattern for the first (number-system) digit
const PARITY_PATTERN = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

export function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(first12[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function generateEAN13(): string {
  // Prefix '2' = internal-use range (200–299 first 3 digits)
  let body = '2';
  for (let i = 0; i < 11; i++) {
    body += Math.floor(Math.random() * 10).toString();
  }
  return body + ean13CheckDigit(body).toString();
}

export function isValidEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  return Number(barcode[12]) === ean13CheckDigit(barcode.slice(0, 12));
}

export function ean13ToBars(barcode: string): string {
  const first = Number(barcode[0]);
  const parity = PARITY_PATTERN[first] ?? 'LLLLLL';

  let bars = '101'; // start guard

  // Left 6 digits (barcode positions 1–6)
  for (let i = 0; i < 6; i++) {
    const digit = Number(barcode[i + 1]);
    const table = parity[i] === 'L' ? L_TABLE : G_TABLE;
    bars += table[digit] ?? '0000000';
  }

  bars += '01010'; // center guard

  // Right 6 digits (barcode positions 7–12)
  for (let i = 0; i < 6; i++) {
    const digit = Number(barcode[i + 7]);
    bars += R_TABLE[digit] ?? '0000000';
  }

  bars += '101'; // end guard

  return bars; // always 95 characters
}

export function generateBarcodeSVGString(value: string): string {
  const bars = ean13ToBars(value);
  const moduleWidth = 2;
  const quietModules = 9;
  const barHeight = 66;
  const totalHeight = 80;
  const totalWidth = (bars.length + quietModules * 2) * moduleWidth;

  const rects = bars
    .split('')
    .map((bit, i) => {
      if (bit !== '1') return '';
      const x = (i + quietModules) * moduleWidth;
      return `<rect x="${x}" y="0" width="${moduleWidth}" height="${barHeight}" fill="black"/>`;
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}">` +
    `<rect width="${totalWidth}" height="${totalHeight}" fill="white"/>` +
    rects +
    `<text x="${totalWidth / 2}" y="77" text-anchor="middle" font-size="10" font-family="monospace" fill="black">${value}</text>` +
    `</svg>`
  );
}
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
npm test -- --testPathPattern="utils/barcode"
```

Expected: PASS — all tests green.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/barcode.ts src/__tests__/utils/barcode.test.ts
git commit -m "feat(utils): add EAN-13 barcode generation, validation, and SVG serialisation"
```

---

## Task 4: EAN13Barcode SVG component

**Files:**
- Create: `src/screens/products/EAN13Barcode.tsx`

No tests — pure display component. Exercised during smoke test.

- [ ] **Step 1: Create `src/screens/products/EAN13Barcode.tsx`**

```tsx
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { ean13ToBars } from '@/utils/barcode';

const MODULE_WIDTH = 2;
const QUIET_MODULES = 9;
const BAR_HEIGHT = 66;
const TOTAL_HEIGHT = 80;

interface Props {
  value: string;
  scale?: number;
}

export function EAN13Barcode({ value, scale = 1 }: Props) {
  const bars = ean13ToBars(value);
  const mw = MODULE_WIDTH * scale;
  const totalWidth = (bars.length + QUIET_MODULES * 2) * mw;
  const totalHeight = TOTAL_HEIGHT * scale;
  const barHeight = BAR_HEIGHT * scale;

  return (
    <Svg width={totalWidth} height={totalHeight}>
      <Rect width={totalWidth} height={totalHeight} fill="white" />
      {bars.split('').map((bit, i) =>
        bit === '1' ? (
          <Rect
            key={i}
            x={(i + QUIET_MODULES) * mw}
            y={0}
            width={mw}
            height={barHeight}
            fill="black"
          />
        ) : null,
      )}
      <SvgText
        x={totalWidth / 2}
        y={totalHeight * 0.96}
        textAnchor="middle"
        fontSize={10 * scale}
        fontFamily="monospace"
        fill="black"
      >
        {value}
      </SvgText>
    </Svg>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add src/screens/products/EAN13Barcode.tsx
git commit -m "feat(products): add EAN13Barcode SVG component"
```

---

## Task 5: Navigation update

**Files:**
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/ProductsStack.tsx`

- [ ] **Step 1: Update `src/navigation/types.ts`**

The current `ProductsStackParamList` is:

```ts
export type ProductsStackParamList = {
  ProductList: undefined;
};
```

Replace it with:

```ts
export type ProductsStackParamList = {
  ProductList: undefined;
  ProductForm: { productId?: number };
};
```

Leave all other types (`RootStackParamList`, `SellStackParamList`, `HistoryStackParamList`, `RootTabParamList`) unchanged.

- [ ] **Step 2: Update `src/navigation/ProductsStack.tsx`**

Replace the entire file with:

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductListScreen } from '@/screens/products/ProductListScreen';
import { ProductFormScreen } from '@/screens/products/ProductFormScreen';
import type { ProductsStackParamList } from './types';

const Stack = createNativeStackNavigator<ProductsStackParamList>();

export function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} />
    </Stack.Navigator>
  );
}
```

`ProductFormScreen` does not exist yet — this will cause a TypeScript error. That's expected and resolves in Task 7.

- [ ] **Step 3: Run tests (should still pass)**

```bash
npm test
```

Expected: all tests pass (tests don't touch navigation files).

- [ ] **Step 4: Commit**

```bash
git add src/navigation/types.ts src/navigation/ProductsStack.tsx
git commit -m "feat(nav): add ProductForm route to ProductsStack"
```

---

## Task 6: ProductListScreen (real implementation)

**Files:**
- Modify: `src/screens/products/ProductListScreen.tsx`

The current file is a placeholder. Replace it entirely with a real, searchable product list.

- [ ] **Step 1: Replace `src/screens/products/ProductListScreen.tsx`**

```tsx
import { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import {
  Appbar,
  FAB,
  List,
  Searchbar,
  Text,
  Dialog,
  Button,
  Portal,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '@/db/DatabaseProvider';
import { listActiveProducts, archiveProduct } from '@/db/queries/products';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { ProductsStackParamList } from '@/navigation/types';
import type { RootStackParamList } from '@/navigation/types';
import type { Product } from '@/db/types';

type Nav = NativeStackNavigationProp<ProductsStackParamList & RootStackParamList>;

export function ProductListScreen() {
  const db = useDatabase();
  const navigation = useNavigation<Nav>();

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setProducts(await listActiveProducts(db));
  }, [db]);

  useFocusEffect(load);

  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : products;

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    await archiveProduct(db, archiveTarget.id);
    setArchiveTarget(null);
    await load();
  }

  function descriptionFor(p: Product): string {
    const price = formatMoney(p.price_centavos);
    if (p.cost_centavos !== null) {
      return `${price}  ·  cost ${formatMoney(p.cost_centavos)}`;
    }
    return price;
  }

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.Content title="Products" />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        />
      </Appbar.Header>

      <Searchbar
        placeholder="Search products"
        value={query}
        onChangeText={setQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {query ? 'No products match your search.' : 'No products yet. Tap + to add one.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={descriptionFor(item)}
              left={(p) => (
                <List.Icon {...p} icon={item.barcode ? 'barcode-scan' : 'package-variant'} />
              )}
              right={(p) => <List.Icon {...p} icon="chevron-right" />}
              onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('ProductForm', { productId: undefined })}
        accessibilityLabel="Add product"
      />

      <Portal>
        <Dialog visible={archiveTarget !== null} onDismiss={() => setArchiveTarget(null)}>
          <Dialog.Title>Archive product?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              "{archiveTarget?.name}" will no longer appear in the catalog. Sales history is
              preserved.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setArchiveTarget(null)}>Cancel</Button>
            <Button textColor={palette.danger} onPress={handleArchiveConfirm}>
              Archive
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  searchbar: {
    margin: 12,
    borderRadius: 12,
    backgroundColor: palette.card,
    elevation: 0,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: { fontSize: 14 },
  list: { paddingBottom: 100 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: palette.borderLight },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: palette.text3, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: palette.primary,
  },
});
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: error about missing `ProductFormScreen` module (introduced in Task 5). This is expected and resolves in Task 7. Other errors should not appear.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add src/screens/products/ProductListScreen.tsx
git commit -m "feat(products): real ProductListScreen — search, FlatList, FAB, archive dialog"
```

---

## Task 7: ProductFormScreen (add/edit with text barcode field)

**Files:**
- Create: `src/screens/products/ProductFormScreen.tsx`

This task implements the full form for creating and editing products. The barcode field is a plain TextInput for now; it will be replaced by the `BarcodeChooserSheet` in Task 8.

**Form behaviour:**
- `productId` absent (route param `undefined`) → Add mode: empty form, "Add Product" header, calls `createProduct`.
- `productId` present → Edit mode: pre-loads via `getProduct`, "Edit Product" header, calls `updateProduct`.
- Archive button (edit mode only): opens a confirmation Dialog, then calls `archiveProduct` and navigates back.
- Price and cost fields accept decimal peso input (e.g. `"15"` or `"15.50"`). `isValidMoneyInput` guards keystrokes; `parseMoney` converts to centavos on save.
- Name is required; price is required and must be > 0; cost is optional but if entered must be > 0.

- [ ] **Step 1: Create `src/screens/products/ProductFormScreen.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  Divider,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  RouteProp,
} from '@react-navigation/native-stack';
import { useDatabase } from '@/db/DatabaseProvider';
import {
  getProduct,
  createProduct,
  updateProduct,
  archiveProduct,
} from '@/db/queries/products';
import { parseMoney, formatMoneyShort, isValidMoneyInput } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { ProductsStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ProductsStackParamList, 'ProductForm'>;
type Route = RouteProp<ProductsStackParamList, 'ProductForm'>;

export function ProductFormScreen() {
  const db = useDatabase();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const productId = route.params?.productId;
  const isEdit = productId !== undefined;

  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [costText, setCostText] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [archiveDialogVisible, setArchiveDialogVisible] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const product = await getProduct(db, productId);
      if (!product) return;
      setName(product.name);
      setPriceText(formatMoneyShort(product.price_centavos));
      setCostText(product.cost_centavos !== null ? formatMoneyShort(product.cost_centavos) : '');
      setBarcode(product.barcode ?? '');
    })();
  }, [db, isEdit, productId]);

  const nameValid = name.trim().length > 0;
  const priceValid = isValidMoneyInput(priceText) && priceText !== '' && parseMoney(priceText) > 0;
  const costValid = costText === '' || (isValidMoneyInput(costText) && parseMoney(costText) > 0);
  const canSave = !loading && nameValid && priceValid && costValid;

  async function handleSave() {
    if (!canSave) return;
    setLoading(true);
    try {
      const input = {
        name: name.trim(),
        price_centavos: parseMoney(priceText),
        cost_centavos: costText.trim() ? parseMoney(costText) : null,
        barcode: barcode.trim() || null,
      };
      if (isEdit) {
        await updateProduct(db, productId, input);
      } else {
        await createProduct(db, input);
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!isEdit) return;
    setLoading(true);
    try {
      await archiveProduct(db, productId);
      setArchiveDialogVisible(false);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEdit ? 'Edit Product' : 'Add Product'} />
        <Appbar.Action
          icon="check"
          disabled={!canSave}
          onPress={handleSave}
          accessibilityLabel="Save"
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          label="Product name *"
          mode="outlined"
          value={name}
          onChangeText={setName}
          style={styles.field}
          autoFocus={!isEdit}
        />

        <TextInput
          label="Selling price (₱) *"
          mode="outlined"
          value={priceText}
          onChangeText={(t) => {
            if (isValidMoneyInput(t)) setPriceText(t);
          }}
          keyboardType="decimal-pad"
          style={styles.field}
        />

        <TextInput
          label="Cost price (₱) — optional"
          mode="outlined"
          value={costText}
          onChangeText={(t) => {
            if (t === '' || isValidMoneyInput(t)) setCostText(t);
          }}
          keyboardType="decimal-pad"
          style={styles.field}
        />

        <TextInput
          label="Barcode — optional"
          mode="outlined"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="numeric"
          style={styles.field}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          disabled={!canSave}
          loading={loading}
          style={styles.saveButton}
        >
          {isEdit ? 'Save changes' : 'Add product'}
        </Button>

        {isEdit && (
          <>
            <Divider style={styles.divider} />
            <Button
              mode="outlined"
              textColor={palette.danger}
              onPress={() => setArchiveDialogVisible(true)}
              style={styles.archiveButton}
            >
              Archive product
            </Button>
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={archiveDialogVisible}
          onDismiss={() => setArchiveDialogVisible(false)}
        >
          <Dialog.Title>Archive product?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              "{name}" will be removed from the catalog. Past sales are not affected.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setArchiveDialogVisible(false)}>Cancel</Button>
            <Button textColor={palette.danger} onPress={handleArchive} loading={loading}>
              Archive
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  field: { backgroundColor: palette.card },
  saveButton: { marginTop: 8 },
  divider: { marginVertical: 24 },
  archiveButton: { borderColor: palette.danger },
});
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS — the missing `ProductFormScreen` import in `ProductsStack.tsx` (Task 5) now resolves. No errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add src/screens/products/ProductFormScreen.tsx
git commit -m "feat(products): add ProductFormScreen — add/edit form with archive"
```

---

## Task 8: BarcodeChooserSheet + camera modal

**Files:**
- Create: `src/screens/products/BarcodeChooserSheet.tsx`
- Modify: `src/screens/products/ProductFormScreen.tsx`

This task replaces the plain barcode TextInput in `ProductFormScreen` with a "Choose barcode" button that opens `BarcodeChooserSheet`. The sheet offers three paths: manual entry, camera scan, or auto-generate. Camera scanning runs as a separate Portal modal in `ProductFormScreen`.

- [ ] **Step 1: Create `src/screens/products/BarcodeChooserSheet.tsx`**

```tsx
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Button,
  Divider,
  List,
  Modal,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { generateEAN13 } from '@/utils/barcode';
import { palette } from '@/theme/palette';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onBarcodeSelected: (barcode: string) => void;
  onScanRequested: () => void;
}

type SheetMode = 'options' | 'manual';

export function BarcodeChooserSheet({
  visible,
  onDismiss,
  onBarcodeSelected,
  onScanRequested,
}: Props) {
  const [mode, setMode] = useState<SheetMode>('options');
  const [manualCode, setManualCode] = useState('');

  function handleDismiss() {
    setMode('options');
    setManualCode('');
    onDismiss();
  }

  function handleManualConfirm() {
    const code = manualCode.trim();
    if (!code) return;
    onBarcodeSelected(code);
    handleDismiss();
  }

  function handleGenerate() {
    onBarcodeSelected(generateEAN13());
    handleDismiss();
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.container}
      >
        <Text variant="titleMedium" style={styles.title}>
          {mode === 'options' ? 'Choose barcode' : 'Enter barcode manually'}
        </Text>
        <Divider style={styles.divider} />

        {mode === 'options' ? (
          <>
            <List.Item
              title="Enter manually"
              description="Type the barcode number"
              left={(p) => <List.Icon {...p} icon="keyboard-outline" />}
              right={(p) => <List.Icon {...p} icon="chevron-right" />}
              onPress={() => setMode('manual')}
            />
            <List.Item
              title="Scan with camera"
              description="Point camera at a barcode"
              left={(p) => <List.Icon {...p} icon="camera-outline" />}
              right={(p) => <List.Icon {...p} icon="chevron-right" />}
              onPress={onScanRequested}
            />
            <List.Item
              title="Generate for me"
              description="Creates an internal EAN-13 code"
              left={(p) => <List.Icon {...p} icon="barcode" />}
              onPress={handleGenerate}
            />
          </>
        ) : (
          <View style={styles.manualContent}>
            <TextInput
              label="Barcode number"
              mode="outlined"
              value={manualCode}
              onChangeText={setManualCode}
              keyboardType="numeric"
              autoFocus
              style={styles.manualInput}
            />
            <View style={styles.manualButtons}>
              <Button onPress={() => setMode('options')}>Back</Button>
              <Button
                mode="contained"
                disabled={!manualCode.trim()}
                onPress={handleManualConfirm}
              >
                Set barcode
              </Button>
            </View>
          </View>
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
  },
  title: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    color: palette.text,
  },
  divider: { marginBottom: 4 },
  manualContent: { padding: 16, gap: 12 },
  manualInput: { backgroundColor: palette.card },
  manualButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
```

- [ ] **Step 2: Update `src/screens/products/ProductFormScreen.tsx`**

Replace the entire file with the updated version that uses `BarcodeChooserSheet` and adds a camera Portal modal:

```tsx
import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Text,
  TextInput,
  Modal,
} from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  RouteProp,
} from '@react-navigation/native-stack';
import { useDatabase } from '@/db/DatabaseProvider';
import {
  getProduct,
  createProduct,
  updateProduct,
  archiveProduct,
} from '@/db/queries/products';
import { parseMoney, formatMoneyShort, isValidMoneyInput } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { ProductsStackParamList } from '@/navigation/types';
import { BarcodeChooserSheet } from './BarcodeChooserSheet';

type Nav = NativeStackNavigationProp<ProductsStackParamList, 'ProductForm'>;
type Route = RouteProp<ProductsStackParamList, 'ProductForm'>;

export function ProductFormScreen() {
  const db = useDatabase();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const productId = route.params?.productId;
  const isEdit = productId !== undefined;

  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [costText, setCostText] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [archiveDialogVisible, setArchiveDialogVisible] = useState(false);
  const [barcodeChooserVisible, setBarcodeChooserVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const product = await getProduct(db, productId);
      if (!product) return;
      setName(product.name);
      setPriceText(formatMoneyShort(product.price_centavos));
      setCostText(product.cost_centavos !== null ? formatMoneyShort(product.cost_centavos) : '');
      setBarcode(product.barcode ?? '');
    })();
  }, [db, isEdit, productId]);

  const nameValid = name.trim().length > 0;
  const priceValid = isValidMoneyInput(priceText) && priceText !== '' && parseMoney(priceText) > 0;
  const costValid = costText === '' || (isValidMoneyInput(costText) && parseMoney(costText) > 0);
  const canSave = !loading && nameValid && priceValid && costValid;

  async function handleSave() {
    if (!canSave) return;
    setLoading(true);
    try {
      const input = {
        name: name.trim(),
        price_centavos: parseMoney(priceText),
        cost_centavos: costText.trim() ? parseMoney(costText) : null,
        barcode: barcode.trim() || null,
      };
      if (isEdit) {
        await updateProduct(db, productId, input);
      } else {
        await createProduct(db, input);
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!isEdit) return;
    setLoading(true);
    try {
      await archiveProduct(db, productId);
      setArchiveDialogVisible(false);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleScanRequested() {
    setBarcodeChooserVisible(false);
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    setCameraVisible(true);
  }

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEdit ? 'Edit Product' : 'Add Product'} />
        <Appbar.Action
          icon="check"
          disabled={!canSave}
          onPress={handleSave}
          accessibilityLabel="Save"
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          label="Product name *"
          mode="outlined"
          value={name}
          onChangeText={setName}
          style={styles.field}
          autoFocus={!isEdit}
        />

        <TextInput
          label="Selling price (₱) *"
          mode="outlined"
          value={priceText}
          onChangeText={(t) => {
            if (isValidMoneyInput(t)) setPriceText(t);
          }}
          keyboardType="decimal-pad"
          style={styles.field}
        />

        <TextInput
          label="Cost price (₱) — optional"
          mode="outlined"
          value={costText}
          onChangeText={(t) => {
            if (t === '' || isValidMoneyInput(t)) setCostText(t);
          }}
          keyboardType="decimal-pad"
          style={styles.field}
        />

        {/* Barcode field */}
        <View style={styles.barcodeRow}>
          <View style={styles.barcodeInfo}>
            <Text variant="labelMedium" style={styles.barcodeLabel}>Barcode</Text>
            <Text
              variant="bodyMedium"
              style={barcode ? styles.barcodeValue : styles.barcodePlaceholder}
            >
              {barcode || 'Not set'}
            </Text>
          </View>
          <Button
            mode="outlined"
            compact
            onPress={() => setBarcodeChooserVisible(true)}
          >
            Choose
          </Button>
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          disabled={!canSave}
          loading={loading}
          style={styles.saveButton}
        >
          {isEdit ? 'Save changes' : 'Add product'}
        </Button>

        {isEdit && (
          <>
            <Divider style={styles.divider} />
            <Button
              mode="outlined"
              textColor={palette.danger}
              onPress={() => setArchiveDialogVisible(true)}
              style={styles.archiveButton}
            >
              Archive product
            </Button>
          </>
        )}
      </ScrollView>

      {/* Barcode chooser sheet */}
      <BarcodeChooserSheet
        visible={barcodeChooserVisible}
        onDismiss={() => setBarcodeChooserVisible(false)}
        onBarcodeSelected={(b) => {
          setBarcode(b);
          setBarcodeChooserVisible(false);
        }}
        onScanRequested={handleScanRequested}
      />

      {/* Camera modal */}
      <Portal>
        <Modal
          visible={cameraVisible}
          onDismiss={() => setCameraVisible(false)}
          contentContainerStyle={StyleSheet.absoluteFillObject}
        >
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={({ data }) => {
              setBarcode(data);
              setCameraVisible(false);
            }}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr'],
            }}
          />
          <IconButton
            icon="close"
            iconColor="white"
            size={32}
            style={styles.cameraClose}
            onPress={() => setCameraVisible(false)}
          />
        </Modal>
      </Portal>

      {/* Archive confirmation dialog */}
      <Portal>
        <Dialog
          visible={archiveDialogVisible}
          onDismiss={() => setArchiveDialogVisible(false)}
        >
          <Dialog.Title>Archive product?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              "{name}" will be removed from the catalog. Past sales are not affected.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setArchiveDialogVisible(false)}>Cancel</Button>
            <Button textColor={palette.danger} onPress={handleArchive} loading={loading}>
              Archive
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  field: { backgroundColor: palette.card },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.card,
    gap: 12,
  },
  barcodeInfo: { flex: 1 },
  barcodeLabel: { color: palette.text3, marginBottom: 2 },
  barcodeValue: { color: palette.text, fontFamily: 'monospace' },
  barcodePlaceholder: { color: palette.muted },
  saveButton: { marginTop: 8 },
  divider: { marginVertical: 24 },
  archiveButton: { borderColor: palette.danger },
  cameraClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS — no errors.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/products/BarcodeChooserSheet.tsx src/screens/products/ProductFormScreen.tsx
git commit -m "feat(products): BarcodeChooserSheet — manual entry, camera scan, EAN-13 generate"
```

---

## Task 9: BarcodeDisplaySheet

**Files:**
- Create: `src/screens/products/BarcodeDisplaySheet.tsx`
- Modify: `src/screens/products/ProductFormScreen.tsx`

When a barcode is set in the form, a "View barcode" button appears. Tapping it opens `BarcodeDisplaySheet`, which renders the EAN-13 barcode as an SVG and offers a "Share" button that writes an SVG file to cache and opens the system share sheet.

- [ ] **Step 1: Create `src/screens/products/BarcodeDisplaySheet.tsx`**

```tsx
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Divider, Modal, Portal, Text } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { generateBarcodeSVGString, isValidEAN13 } from '@/utils/barcode';
import { palette } from '@/theme/palette';
import { EAN13Barcode } from './EAN13Barcode';

interface Props {
  visible: boolean;
  value: string;
  onDismiss: () => void;
}

export function BarcodeDisplaySheet({ visible, value, onDismiss }: Props) {
  const [sharing, setSharing] = useState(false);

  const canRender = isValidEAN13(value);

  async function handleShare() {
    setSharing(true);
    try {
      const svgContent = generateBarcodeSVGString(value);
      const path = `${FileSystem.cacheDirectory}barcode-${value}.svg`;
      await FileSystem.writeAsStringAsync(path, svgContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(path, {
        mimeType: 'image/svg+xml',
        dialogTitle: 'Share barcode label',
        UTI: 'public.svg-image',
      });
    } finally {
      setSharing(false);
    }
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <Text variant="titleMedium" style={styles.title}>
          Barcode
        </Text>
        <Divider style={styles.divider} />

        <View style={styles.barcodeArea}>
          {canRender ? (
            <EAN13Barcode value={value} scale={1.5} />
          ) : (
            <View style={styles.nonEan}>
              <Text variant="bodyLarge" style={styles.nonEanText}>
                {value}
              </Text>
              <Text variant="bodySmall" style={styles.nonEanNote}>
                Not an EAN-13 — display only
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {canRender && (
            <Button
              mode="outlined"
              icon="share-variant"
              onPress={handleShare}
              loading={sharing}
              disabled={sharing}
            >
              Share label
            </Button>
          )}
          <Button mode="text" onPress={onDismiss}>
            Close
          </Button>
        </View>
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
    paddingBottom: 16,
  },
  title: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    color: palette.text,
  },
  divider: { marginBottom: 16 },
  barcodeArea: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nonEan: { alignItems: 'center', gap: 4 },
  nonEanText: { fontFamily: 'monospace', color: palette.text },
  nonEanNote: { color: palette.text3 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
```

- [ ] **Step 2: Update `src/screens/products/ProductFormScreen.tsx`**

Add `barcodeDisplayVisible` state and the "View barcode" button + `BarcodeDisplaySheet`.

Find the barcode section in `ProductFormScreen` and make the following changes:

**Add import** after the existing `BarcodeChooserSheet` import:

```tsx
import { BarcodeDisplaySheet } from './BarcodeDisplaySheet';
```

**Add state** after the existing `cameraVisible` state:

```tsx
const [barcodeDisplayVisible, setBarcodeDisplayVisible] = useState(false);
```

**Replace the barcode row** (the `<View style={styles.barcodeRow}>` block) with:

```tsx
{/* Barcode field */}
<View style={styles.barcodeRow}>
  <View style={styles.barcodeInfo}>
    <Text variant="labelMedium" style={styles.barcodeLabel}>Barcode</Text>
    <Text
      variant="bodyMedium"
      style={barcode ? styles.barcodeValue : styles.barcodePlaceholder}
    >
      {barcode || 'Not set'}
    </Text>
  </View>
  <View style={styles.barcodeButtons}>
    {barcode ? (
      <Button compact mode="text" onPress={() => setBarcodeDisplayVisible(true)}>
        View
      </Button>
    ) : null}
    <Button
      mode="outlined"
      compact
      onPress={() => setBarcodeChooserVisible(true)}
    >
      Choose
    </Button>
  </View>
</View>
```

**Add the `BarcodeDisplaySheet`** just before the closing `</View>` of the root view, after the archive confirmation dialog:

```tsx
{/* Barcode display sheet */}
<BarcodeDisplaySheet
  visible={barcodeDisplayVisible}
  value={barcode}
  onDismiss={() => setBarcodeDisplayVisible(false)}
/>
```

**Add the `barcodeButtons` style** to `StyleSheet.create`:

```ts
barcodeButtons: { flexDirection: 'row', alignItems: 'center' },
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/products/BarcodeDisplaySheet.tsx src/screens/products/ProductFormScreen.tsx
git commit -m "feat(products): BarcodeDisplaySheet — EAN-13 SVG view and share"
```

---

## Task 10: Manual smoke test

**No code changes.** Rebuild and verify all features end-to-end on a physical Android device or emulator.

> The new native modules (expo-camera, react-native-svg) require a full rebuild. The existing dev client build from Phase 2 will not load these modules.

- [ ] **Step 1: Rebuild the Android dev client**

```bash
npx expo run:android
```

Expected: builds and installs on the connected device. App launches and displays the Sell tab.

- [ ] **Step 2: Verify Products tab — empty state**

Tap the **Products** tab. Confirm the placeholder is gone and the real screen shows:
- "Products" header with gear icon
- Search bar
- "No products yet. Tap + to add one." empty state
- FAB (+) in the bottom-right

- [ ] **Step 3: Add a product without barcode**

Tap FAB → "Add Product" screen. Enter:
- Name: `Chippy Corn Chips`
- Price: `15`
- Cost: `10`
- Leave barcode unset

Tap ✓ (checkmark). Expected: returns to product list showing "Chippy Corn Chips · ₱15.00 · cost ₱10.00".

- [ ] **Step 4: Add a product with a generated barcode**

Tap FAB → enter name "C2 Apple Drink", price "20", cost "14". Tap "Choose" → "Generate for me". The barcode row shows a 13-digit code starting with "2". Tap ✓. Confirm the product appears in the list with a barcode icon.

- [ ] **Step 5: View the generated barcode SVG**

Tap the "C2 Apple Drink" item → edit screen. The barcode row shows the generated code. Tap "View" → `BarcodeDisplaySheet` opens, showing the EAN-13 barcode as black bars on white with the digits below. Tap "Share label" → system share sheet appears with an SVG file.

- [ ] **Step 6: Edit a product**

Tap "Chippy Corn Chips" → edit screen pre-filled. Change price to "16". Tap ✓. List shows updated price.

- [ ] **Step 7: Camera scan (requires device with working camera)**

Tap FAB → new product form → "Choose" → "Scan with camera". Permission prompt appears on first use — tap Allow. Camera view fills the screen. Point at any barcode (e.g. a product packaging). The barcode field is populated and camera closes automatically.

If no physical barcode is available: tap the X button to close the camera without scanning.

- [ ] **Step 8: Archive a product**

Tap "Chippy Corn Chips" → edit screen → "Archive product" → confirmation dialog appears → "Archive". Returns to list. "Chippy Corn Chips" no longer appears.

- [ ] **Step 9: Search**

With at least two products in the list, type "C2" in the search bar. Only matching products appear. Clear search — all products show again.

- [ ] **Step 10: Sell screen still works**

Switch to the Sell tab. Confirm the catalog grid still shows the seeded products and the sell flow is unaffected.

- [ ] **Step 11: Commit smoke-test fixes (if any)**

If you fixed anything during smoke test:

```bash
git add -A
git commit -m "fix(products): <describe what was fixed>"
```

If nothing needed fixing, no commit is required.

---

## Self-Review Checklist

**Spec coverage** (Plan 1 Phase 3 description: "Product list w/ search, FAB, add/edit form, soft delete, barcode chooser sheet, camera scan, generated barcode SVG + share"):
- Product list with search → Task 6 ✓
- FAB → Task 6 ✓
- Add/edit form → Task 7 ✓
- Soft delete (archive) → Task 7 (archive button) + Task 6 (archive dialog, used after navigating from list to edit) ✓
- Barcode chooser sheet → Task 8 ✓
- Camera scan → Task 8 ✓
- Generated barcode → Task 8 (BarcodeChooserSheet generates EAN-13) ✓
- SVG display → Task 9 (EAN13Barcode + BarcodeDisplaySheet) ✓
- Share → Task 9 (BarcodeDisplaySheet share button) ✓

**No placeholders:** every step contains actual code or exact commands. ✓

**Type consistency:**
- `ProductsStackParamList.ProductForm: { productId?: number }` defined in Task 5; used in Task 6 (`navigation.navigate('ProductForm', { productId: item.id })`), Task 7 (`useRoute<Route>()`). ✓
- `createProduct`, `updateProduct`, `archiveProduct`, `getProduct` defined in Task 2; used in Task 7 and Task 6. ✓
- `ean13ToBars`, `generateEAN13`, `generateBarcodeSVGString`, `isValidEAN13` defined in Task 3; used in Task 4 (`EAN13Barcode`), Task 8 (`BarcodeChooserSheet`), Task 9 (`BarcodeDisplaySheet`). ✓
- `EAN13Barcode` component defined in Task 4; used in Task 9 (`BarcodeDisplaySheet`). ✓
- `BarcodeChooserSheet` defined in Task 8; imported and used in Task 8's `ProductFormScreen` update. ✓
- `BarcodeDisplaySheet` defined in Task 9; imported and used in Task 9's `ProductFormScreen` update. ✓

**TDD:** DB queries (Task 2) and barcode utilities (Task 3) are written test-first. UI tasks (Tasks 4–9) skip TDD by design — no in-process test harness available for native components.
