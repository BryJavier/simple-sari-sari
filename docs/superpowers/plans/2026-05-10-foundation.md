# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a runnable Expo Android app with theme, typography, navigation skeleton, SQLite schema, settings persistence, and adaptive phone/tablet layout — ready for feature plans to layer on top.

**Architecture:** Expo (managed) + dev client. React Native Paper for UI. React Navigation for tabs/stacks. Zustand for in-memory state, persisted via a SQLite-backed settings table. expo-sqlite in production; `better-sqlite3` (in-memory) in tests via a thin `Database` interface so query modules are unit-testable without native bindings.

**Tech Stack:** Expo SDK 52+, React Native, TypeScript (strict), React Native Paper, React Navigation (bottom-tabs + native-stack), Zustand, expo-sqlite, expo-font, `@expo-google-fonts/plus-jakarta-sans`, Jest + jest-expo + @testing-library/react-native, ESLint + Prettier, better-sqlite3 (devDep, tests only).

**Spec reference:** [docs/superpowers/specs/2026-05-10-sari-sari-pos-design.md](../specs/2026-05-10-sari-sari-pos-design.md). This plan implements §2 (stack), §3 (IA skeleton, no business logic yet), §4 (full DB schema, only `settings` queries), §6 (adaptive layout hook), §7 (theme), §8 (Display settings).

---

## File Structure

Files created/modified by this plan:

| Path | Purpose |
|---|---|
| `package.json` | Project manifest + scripts |
| `tsconfig.json` | Strict TS config |
| `app.json` | Expo config (name, slug, orientation, Android adaptive icon) |
| `babel.config.js` | Expo preset |
| `metro.config.js` | Default Expo metro |
| `index.ts` | RN entry registering `App` |
| `App.tsx` | Root: fonts gate, DB init, providers, navigation |
| `.eslintrc.js`, `.prettierrc` | Lint + format |
| `jest.config.js`, `jest.setup.ts` | Jest + RN testing-library config |
| `src/utils/money.ts` (+ test) | Centavos ↔ peso parsing/formatting |
| `src/utils/date.ts` (+ test) | "Today" bounds, ISO formatting |
| `src/utils/layout.ts` (+ test) | `useIsTablet()` breakpoint hook |
| `src/theme/palette.ts` | Color tokens |
| `src/theme/typography.ts` | Font-size scale |
| `src/theme/types.ts` | `TextSizeKey`, `DensityKey`, scale tables |
| `src/theme/paperTheme.ts` | `buildPaperTheme(textScale)` |
| `src/theme/ThemeProvider.tsx` | Provides scaled Paper theme from settings |
| `src/db/types.ts` | `Database` interface |
| `src/db/expoClient.ts` | expo-sqlite impl of `Database` |
| `src/db/testClient.ts` | better-sqlite3 impl of `Database` (tests only) |
| `src/db/migrationFiles/v1.ts` | Initial schema SQL |
| `src/db/migrations.ts` (+ test) | `applyMigrations(db)` |
| `src/db/queries/settings.ts` (+ test) | `getSetting`, `setSetting` |
| `src/store/settings.ts` (+ test) | Zustand store (textSize, density, storeName) |
| `src/navigation/BottomTabs.tsx` | 3-tab layout |
| `src/navigation/SellStack.tsx`, `ProductsStack.tsx`, `HistoryStack.tsx` | Per-tab stacks |
| `src/screens/sell/SellScreen.tsx` | Empty placeholder |
| `src/screens/products/ProductListScreen.tsx` | Empty placeholder |
| `src/screens/history/HistoryScreen.tsx` | Empty placeholder + gear → Settings |
| `src/screens/settings/SettingsScreen.tsx` | Top-level settings menu |
| `src/screens/settings/DisplaySettingsScreen.tsx` | Text size + density segmented controls |

---

## Task 1: Scaffold Expo TypeScript project at repo root

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `app.json`
- Create: `babel.config.js`
- Create: `metro.config.js`
- Create: `index.ts`
- Create: `App.tsx`
- Create: `assets/.gitkeep`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sari-pos",
  "version": "0.1.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint 'src/**/*.{ts,tsx}' 'App.tsx' 'index.ts'",
    "format": "prettier --write 'src/**/*.{ts,tsx}' 'App.tsx' 'index.ts'",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {},
  "private": true
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "App.tsx", "index.ts", "*.d.ts"]
}
```

- [ ] **Step 3: Create `app.json`**

```json
{
  "expo": {
    "name": "Sari POS",
    "slug": "sari-pos",
    "version": "0.1.0",
    "orientation": "default",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "resizeMode": "contain",
      "backgroundColor": "#ECEFF1"
    },
    "assetBundlePatterns": ["**/*"],
    "android": {
      "package": "com.sari.pos",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ECEFF1"
      },
      "permissions": ["CAMERA"]
    },
    "plugins": ["expo-sqlite", "expo-font"]
  }
}
```

- [ ] **Step 4: Create `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
```

- [ ] **Step 5: Create `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');
module.exports = getDefaultConfig(__dirname);
```

- [ ] **Step 6: Create `index.ts`**

```ts
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

- [ ] **Step 7: Create placeholder `App.tsx`** (we'll replace it in Task 14)

```tsx
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Sari POS — bootstrapping…</Text>
    </View>
  );
}
```

- [ ] **Step 8: Create empty `assets/` directory**

Run: `mkdir -p assets && touch assets/.gitkeep`

(Real icons are out of scope for Plan 1 — Expo will warn but run.)

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json app.json babel.config.js metro.config.js index.ts App.tsx assets/.gitkeep
git commit -m "chore(foundation): scaffold Expo TypeScript project"
```

---

## Task 2: Install runtime + dev dependencies

**Files:**
- Modify: `package.json`
- Create: `package-lock.json` (auto)

- [ ] **Step 1: Install Expo + React Native core**

```bash
npx expo install expo expo-status-bar react react-native
```

- [ ] **Step 2: Install navigation + UI**

```bash
npx expo install react-native-paper react-native-safe-area-context react-native-screens \
  @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack \
  @expo/vector-icons
```

- [ ] **Step 3: Install state, DB, fonts**

```bash
npx expo install zustand expo-sqlite expo-font @expo-google-fonts/plus-jakarta-sans
```

- [ ] **Step 4: Install dev dependencies (TypeScript, Jest, lint)**

```bash
npm install --save-dev typescript @types/react jest jest-expo @testing-library/react-native \
  @testing-library/jest-native better-sqlite3 @types/better-sqlite3 \
  eslint eslint-config-expo prettier eslint-config-prettier eslint-plugin-prettier \
  babel-plugin-module-resolver
```

- [ ] **Step 5: Verify install**

Run: `npx expo --version && node -e "console.log(require('./package.json').dependencies)"`

Expected: prints Expo CLI version and a deps object including `react-native-paper`, `expo-sqlite`, `zustand`, `@expo-google-fonts/plus-jakarta-sans`, etc.

- [ ] **Step 6: Commit lockfile + updated package.json**

```bash
git add package.json package-lock.json
git commit -m "chore(foundation): install runtime and dev dependencies"
```

---

## Task 3: Configure Jest, ESLint, Prettier

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.ts`
- Create: `.eslintrc.js`
- Create: `.prettierrc`
- Create: `.eslintignore`
- Create: `src/__tests__/sanity.test.ts`

- [ ] **Step 1: Create `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|@expo|expo(nent)?|react-native-paper|@expo-google-fonts)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts(x)?'],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/db/**/*.ts',
    'src/store/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    'src/utils/**/*.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
    'src/db/queries/**/*.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
```

- [ ] **Step 2: Create `jest.setup.ts`**

```ts
import '@testing-library/jest-native/extend-expect';
```

- [ ] **Step 3: Create `.eslintrc.js`**

```js
module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/consistent-type-imports': 'warn',
  },
  ignorePatterns: ['node_modules/', 'dist/', '.expo/', 'coverage/'],
};
```

- [ ] **Step 4: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 5: Create `.eslintignore`**

```
node_modules
.expo
dist
coverage
android
ios
```

- [ ] **Step 6: Create sanity test `src/__tests__/sanity.test.ts`**

```ts
describe('sanity', () => {
  it('runs jest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run sanity test**

Run: `npm test -- --testPathPattern=sanity`
Expected: PASS — 1 test passing.

- [ ] **Step 8: Run lint**

Run: `npm run lint`
Expected: no errors (may have warnings).

- [ ] **Step 9: Commit**

```bash
git add jest.config.js jest.setup.ts .eslintrc.js .prettierrc .eslintignore src/__tests__/sanity.test.ts
git commit -m "chore(foundation): configure Jest, ESLint, Prettier"
```

---

## Task 4: Money utilities (TDD)

**Files:**
- Create: `src/utils/money.ts`
- Test: `src/__tests__/utils/money.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/utils/money.test.ts`:

```ts
import {
  parseMoney,
  formatMoney,
  formatMoneyShort,
  isValidMoneyInput,
  MoneyParseError,
} from '@/utils/money';

describe('parseMoney', () => {
  it('parses whole pesos', () => {
    expect(parseMoney('12')).toBe(1200);
  });
  it('parses pesos with two decimals', () => {
    expect(parseMoney('12.50')).toBe(1250);
  });
  it('parses pesos with one decimal as ten-centavo', () => {
    expect(parseMoney('12.5')).toBe(1250);
  });
  it('strips a leading peso symbol', () => {
    expect(parseMoney('₱12.50')).toBe(1250);
  });
  it('strips surrounding whitespace', () => {
    expect(parseMoney('  ₱12.50 ')).toBe(1250);
  });
  it('treats empty string as zero', () => {
    expect(parseMoney('')).toBe(0);
  });
  it('rejects negative numbers', () => {
    expect(() => parseMoney('-5')).toThrow(MoneyParseError);
  });
  it('rejects more than two decimals', () => {
    expect(() => parseMoney('12.501')).toThrow(MoneyParseError);
  });
  it('rejects non-numeric input', () => {
    expect(() => parseMoney('abc')).toThrow(MoneyParseError);
  });
});

describe('formatMoney', () => {
  it('formats zero', () => {
    expect(formatMoney(0)).toBe('₱0');
  });
  it('formats whole pesos without decimal', () => {
    expect(formatMoney(1200)).toBe('₱12');
  });
  it('formats fractional pesos with two decimals', () => {
    expect(formatMoney(1250)).toBe('₱12.50');
  });
  it('formats large amounts with thousands separator', () => {
    expect(formatMoney(234000)).toBe('₱2,340');
    expect(formatMoney(234050)).toBe('₱2,340.50');
  });
});

describe('formatMoneyShort', () => {
  it('omits the peso symbol', () => {
    expect(formatMoneyShort(1250)).toBe('12.50');
    expect(formatMoneyShort(1200)).toBe('12');
  });
});

describe('isValidMoneyInput', () => {
  it.each([
    ['', true],
    ['1', true],
    ['12', true],
    ['12.', true],
    ['12.5', true],
    ['12.50', true],
    ['0.05', true],
  ])('accepts in-progress input %p', (input, expected) => {
    expect(isValidMoneyInput(input)).toBe(expected);
  });

  it.each([
    ['12.501', false],
    ['-1', false],
    ['abc', false],
    ['1.2.3', false],
  ])('rejects %p', (input) => {
    expect(isValidMoneyInput(input)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm test -- --testPathPattern=money`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/money.ts`**

```ts
export class MoneyParseError extends Error {
  constructor(input: string) {
    super(`Invalid money input: "${input}"`);
    this.name = 'MoneyParseError';
  }
}

const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const IN_PROGRESS_RE = /^\d*(\.\d{0,2})?$/;

function strip(input: string): string {
  return input.trim().replace(/^₱/, '');
}

export function parseMoney(raw: string): number {
  const s = strip(raw);
  if (s === '') return 0;
  if (!MONEY_RE.test(s)) throw new MoneyParseError(raw);
  const [whole, frac = ''] = s.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  return Number(whole) * 100 + Number(fracPadded);
}

export function formatMoney(centavos: number): string {
  return '₱' + formatMoneyShort(centavos);
}

export function formatMoneyShort(centavos: number): string {
  const whole = Math.floor(centavos / 100);
  const frac = centavos % 100;
  const wholeStr = whole.toLocaleString('en-PH');
  if (frac === 0) return wholeStr;
  return `${wholeStr}.${frac.toString().padStart(2, '0')}`;
}

export function isValidMoneyInput(raw: string): boolean {
  const s = strip(raw);
  if (s === '') return true;
  return IN_PROGRESS_RE.test(s);
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npm test -- --testPathPattern=money`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/money.ts src/__tests__/utils/money.test.ts
git commit -m "feat(utils): add money parsing and formatting (centavos)"
```

---

## Task 5: Date utilities (TDD)

**Files:**
- Create: `src/utils/date.ts`
- Test: `src/__tests__/utils/date.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/utils/date.test.ts`:

```ts
import { dayBoundsLocalISO, isSameLocalDay, formatDayLabel, todayISO } from '@/utils/date';

describe('dayBoundsLocalISO', () => {
  it('returns ISO bounds spanning a calendar day', () => {
    const { start, end } = dayBoundsLocalISO(new Date('2026-05-10T14:23:00'));
    expect(start.endsWith('T00:00:00.000')).toBe(true);
    expect(end.endsWith('T23:59:59.999')).toBe(true);
    expect(start.startsWith('2026-05-10')).toBe(true);
    expect(end.startsWith('2026-05-10')).toBe(true);
  });
});

describe('isSameLocalDay', () => {
  it('treats two timestamps in the same calendar day as equal', () => {
    expect(
      isSameLocalDay(new Date('2026-05-10T01:00:00'), new Date('2026-05-10T23:30:00')),
    ).toBe(true);
  });
  it('treats different calendar days as not equal', () => {
    expect(
      isSameLocalDay(new Date('2026-05-10T23:00:00'), new Date('2026-05-11T01:00:00')),
    ).toBe(false);
  });
});

describe('formatDayLabel', () => {
  const today = new Date('2026-05-10T10:00:00');

  it('returns "Today" for the same day', () => {
    expect(formatDayLabel(new Date('2026-05-10T15:00:00'), today)).toBe('Today');
  });
  it('returns "Yesterday" for the previous day', () => {
    expect(formatDayLabel(new Date('2026-05-09T10:00:00'), today)).toBe('Yesterday');
  });
  it('returns a short month-day for older dates in the same year', () => {
    expect(formatDayLabel(new Date('2026-05-07T10:00:00'), today)).toBe('May 7');
  });
  it('includes the year for dates in a different year', () => {
    expect(formatDayLabel(new Date('2025-12-30T10:00:00'), today)).toBe('Dec 30, 2025');
  });
});

describe('todayISO', () => {
  it('returns a parseable ISO string', () => {
    const iso = todayISO();
    expect(new Date(iso).toString()).not.toBe('Invalid Date');
  });
});
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `npm test -- --testPathPattern=date`
Expected: FAIL.

- [ ] **Step 3: Implement `src/utils/date.ts`**

```ts
function pad(n: number, width = 2): string {
  return n.toString().padStart(width, '0');
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function dayBoundsLocalISO(date: Date): { start: string; end: string } {
  const day = ymd(date);
  return {
    start: `${day}T00:00:00.000`,
    end: `${day}T23:59:59.999`,
  };
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b);
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDayLabel(date: Date, today: Date = new Date()): string {
  if (isSameLocalDay(date, today)) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return 'Yesterday';

  const month = MONTH_SHORT[date.getMonth()];
  const day = date.getDate();
  if (date.getFullYear() === today.getFullYear()) return `${month} ${day}`;
  return `${month} ${day}, ${date.getFullYear()}`;
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- --testPathPattern=date`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/date.ts src/__tests__/utils/date.test.ts
git commit -m "feat(utils): add date helpers for today bounds and labels"
```

---

## Task 6: Layout breakpoint hook (TDD)

**Files:**
- Create: `src/utils/layout.ts`
- Test: `src/__tests__/utils/layout.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/utils/layout.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';
import { TABLET_BREAKPOINT_DP, useIsTablet } from '@/utils/layout';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return { ...actual, useWindowDimensions: jest.fn() };
});

const mockedDims = useWindowDimensions as jest.MockedFunction<typeof useWindowDimensions>;

describe('useIsTablet', () => {
  it('returns false below the breakpoint', () => {
    mockedDims.mockReturnValue({ width: TABLET_BREAKPOINT_DP - 1, height: 800, scale: 1, fontScale: 1 });
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it('returns true at the breakpoint', () => {
    mockedDims.mockReturnValue({ width: TABLET_BREAKPOINT_DP, height: 800, scale: 1, fontScale: 1 });
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });

  it('returns true above the breakpoint', () => {
    mockedDims.mockReturnValue({ width: TABLET_BREAKPOINT_DP + 200, height: 800, scale: 1, fontScale: 1 });
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `npm test -- --testPathPattern=layout`
Expected: FAIL.

- [ ] **Step 3: Implement `src/utils/layout.ts`**

```ts
import { useWindowDimensions } from 'react-native';

export const TABLET_BREAKPOINT_DP = 720;

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT_DP;
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- --testPathPattern=layout`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/layout.ts src/__tests__/utils/layout.test.tsx
git commit -m "feat(utils): add useIsTablet breakpoint hook (720dp)"
```

---

## Task 7: Theme tokens (palette + typography)

**Files:**
- Create: `src/theme/palette.ts`
- Create: `src/theme/typography.ts`
- Create: `src/theme/types.ts`

No tests — these are pure constants.

- [ ] **Step 1: Create `src/theme/palette.ts`**

```ts
export const palette = {
  text: '#212121',
  text2: '#263238',
  text3: '#616161',
  primary: '#455A64',
  accent: '#607D8B',
  muted: '#90A4AE',
  border: '#CFD8DC',
  borderLight: '#ECEFF1',
  softBg: '#ECEFF1',
  surface: '#FAFAFA',
  card: '#FFFFFF',
  profit: '#2E7D32',
  utang: '#E65100',
  danger: '#C62828',
  warning: '#F57C00',
  success: '#2E7D32',
  successBg: '#E8F5E9',
  warningBg: '#FFF8E1',
  utangBg: '#FFF3E0',
} as const;

export type PaletteKey = keyof typeof palette;
```

- [ ] **Step 2: Create `src/theme/types.ts`**

```ts
export type TextSizeKey = 'small' | 'medium' | 'large' | 'xlarge';
export type DensityKey = 'compact' | 'comfortable' | 'spacious';

export const TEXT_SIZE_SCALE: Record<TextSizeKey, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.15,
  xlarge: 1.3,
};

export const DENSITY_COLUMNS: Record<DensityKey, { phone: number; tablet: number }> = {
  compact: { phone: 3, tablet: 4 },
  comfortable: { phone: 2, tablet: 3 },
  spacious: { phone: 2, tablet: 3 },
};

export const DENSITY_TILE_PADDING: Record<DensityKey, number> = {
  compact: 10,
  comfortable: 14,
  spacious: 18,
};

export const DEFAULT_TEXT_SIZE: TextSizeKey = 'medium';
export const DEFAULT_DENSITY: DensityKey = 'comfortable';
```

- [ ] **Step 3: Create `src/theme/typography.ts`**

```ts
export const baseTypography = {
  display: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.48 },
  total: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.44 },
  title: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.18 },
  price: { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.36 },
  tileName: { fontSize: 14, fontWeight: '600' as const, letterSpacing: -0.14 },
  body: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.66 },
  pillLabel: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
};

export type TypographyRole = keyof typeof baseTypography;

export function scaleTypography(scale: number) {
  const out = {} as Record<TypographyRole, (typeof baseTypography)[TypographyRole]>;
  (Object.keys(baseTypography) as TypographyRole[]).forEach((key) => {
    const t = baseTypography[key];
    out[key] = { ...t, fontSize: Math.round(t.fontSize * scale) };
  });
  return out;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/theme/palette.ts src/theme/typography.ts src/theme/types.ts
git commit -m "feat(theme): add palette, typography scale, and density tokens"
```

---

## Task 8: Paper theme builder + ThemeProvider

**Files:**
- Create: `src/theme/paperTheme.ts`
- Create: `src/theme/ThemeProvider.tsx`

No unit tests — exercised via smoke test in Task 18.

- [ ] **Step 1: Create `src/theme/paperTheme.ts`**

```ts
import { MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { palette } from './palette';
import { scaleTypography } from './typography';

export function buildPaperTheme(textScale: number): MD3Theme {
  const t = scaleTypography(textScale);
  return {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: palette.primary,
      onPrimary: '#FFFFFF',
      surface: palette.card,
      surfaceVariant: palette.softBg,
      background: palette.surface,
      onBackground: palette.text,
      onSurface: palette.text,
      onSurfaceVariant: palette.text3,
      outline: palette.border,
      outlineVariant: palette.borderLight,
      error: palette.danger,
    },
    fonts: {
      ...MD3LightTheme.fonts,
      default: { fontFamily: 'PlusJakartaSans_500Medium', ...t.body, fontWeight: '500' },
      bodyLarge: { fontFamily: 'PlusJakartaSans_500Medium', ...t.body },
      bodyMedium: { fontFamily: 'PlusJakartaSans_500Medium', ...t.body },
      bodySmall: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: t.caption.fontSize, fontWeight: '500' },
      titleLarge: { fontFamily: 'PlusJakartaSans_700Bold', ...t.title },
      titleMedium: { fontFamily: 'PlusJakartaSans_700Bold', ...t.title, fontSize: t.title.fontSize - 2 },
      titleSmall: { fontFamily: 'PlusJakartaSans_600SemiBold', ...t.tileName },
      labelLarge: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: t.body.fontSize, fontWeight: '600' },
      labelMedium: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: t.caption.fontSize, fontWeight: '600' },
      labelSmall: { fontFamily: 'PlusJakartaSans_600SemiBold', ...t.caption },
      headlineLarge: { fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.display },
      headlineMedium: { fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.total },
      headlineSmall: { fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.price },
      displayLarge: { fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.display },
      displayMedium: { fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.total },
      displaySmall: { fontFamily: 'PlusJakartaSans_800ExtraBold', ...t.price },
    },
  };
}
```

- [ ] **Step 2: Create `src/theme/ThemeProvider.tsx`**

```tsx
import { useMemo, type ReactNode } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { useSettingsStore } from '@/store/settings';
import { TEXT_SIZE_SCALE } from '@/theme/types';
import { buildPaperTheme } from '@/theme/paperTheme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const textSize = useSettingsStore((s) => s.textSize);
  const theme = useMemo(() => buildPaperTheme(TEXT_SIZE_SCALE[textSize]), [textSize]);
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
```

(`useSettingsStore` will exist after Task 13; this file imports forward — that's fine, no compile errors until App.tsx wires it up in Task 14.)

- [ ] **Step 3: Run typecheck (will fail because of forward reference; ignored until Task 13)**

Run: `npm run typecheck`
Expected: FAIL with "Cannot find module '@/store/settings'". This is expected — fixed in Task 13. Stage the files anyway so the commit captures intent.

- [ ] **Step 4: Commit**

```bash
git add src/theme/paperTheme.ts src/theme/ThemeProvider.tsx
git commit -m "feat(theme): add Paper theme builder and ThemeProvider"
```

---

## Task 9: Database client abstraction

**Files:**
- Create: `src/db/types.ts`
- Create: `src/db/expoClient.ts`
- Create: `src/db/testClient.ts`

- [ ] **Step 1: Create `src/db/types.ts`**

```ts
export type SqlParam = string | number | null;

export interface Database {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<{ changes: number; lastInsertRowid: number }>;
  all<T = unknown>(sql: string, params?: SqlParam[]): Promise<T[]>;
  get<T = unknown>(sql: string, params?: SqlParam[]): Promise<T | undefined>;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
```

- [ ] **Step 2: Create `src/db/expoClient.ts`**

```ts
import * as SQLite from 'expo-sqlite';
import type { Database, SqlParam } from './types';

class ExpoDatabase implements Database {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async exec(sql: string): Promise<void> {
    await this.db.execAsync(sql);
  }

  async run(sql: string, params: SqlParam[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    const result = await this.db.runAsync(sql, params);
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowId) };
  }

  async all<T = unknown>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    return (await this.db.getAllAsync<T>(sql, params)) as T[];
  }

  async get<T = unknown>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
    const row = await this.db.getFirstAsync<T>(sql, params);
    return row ?? undefined;
  }

  async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    let result!: T;
    await this.db.withTransactionAsync(async () => {
      result = await fn(this);
    });
    return result;
  }

  async close(): Promise<void> {
    await this.db.closeAsync();
  }
}

let openInstance: ExpoDatabase | null = null;

export async function openExpoDatabase(name = 'sari.db'): Promise<Database> {
  if (openInstance) return openInstance;
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  openInstance = new ExpoDatabase(db);
  return openInstance;
}
```

- [ ] **Step 3: Create `src/db/testClient.ts`**

```ts
import BetterSqlite3, { type Database as Better } from 'better-sqlite3';
import type { Database, SqlParam } from './types';

class TestDatabase implements Database {
  constructor(private readonly db: Better) {}

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async run(sql: string, params: SqlParam[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    const result = this.db.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
  }

  async all<T = unknown>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async get<T = unknown>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    let resultPromise!: Promise<T>;
    this.db.transaction(() => {
      resultPromise = fn(this);
    })();
    return resultPromise;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export function openTestDatabase(): Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('foreign_keys = ON');
  return new TestDatabase(db);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/db/types.ts src/db/expoClient.ts src/db/testClient.ts
git commit -m "feat(db): add Database interface with expo-sqlite and better-sqlite3 impls"
```

---

## Task 10: Migration runner (TDD)

**Files:**
- Create: `src/db/migrationFiles/v1.ts`
- Create: `src/db/migrations.ts`
- Test: `src/__tests__/db/migrations.test.ts`

- [ ] **Step 1: Create the v1 schema file `src/db/migrationFiles/v1.ts`**

```ts
export const v1Schema = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price_centavos INTEGER NOT NULL CHECK (price_centavos >= 0),
  cost_centavos INTEGER NULL CHECK (cost_centavos IS NULL OR cost_centavos >= 0),
  barcode TEXT UNIQUE,
  is_generated INTEGER NOT NULL DEFAULT 0 CHECK (is_generated IN (0, 1)),
  created_at TEXT NOT NULL,
  archived_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_archived ON products(archived_at);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_centavos INTEGER NOT NULL CHECK (total_centavos >= 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'utang')),
  customer_name TEXT,
  voided_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_voided ON sales(voided_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_name);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  unit_price_centavos INTEGER NOT NULL,
  unit_cost_centavos INTEGER,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

CREATE TABLE IF NOT EXISTS utang_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
  paid_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_utang_payments_sale ON utang_payments(sale_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;
```

- [ ] **Step 2: Write the failing tests `src/__tests__/db/migrations.test.ts`**

```ts
import { openTestDatabase } from '@/db/testClient';
import { applyMigrations, getSchemaVersion, CURRENT_SCHEMA_VERSION } from '@/db/migrations';

describe('migrations', () => {
  it('starts a fresh database at version 0', async () => {
    const db = openTestDatabase();
    expect(await getSchemaVersion(db)).toBe(0);
    await db.close();
  });

  it('applies migrations and updates the schema version', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    expect(await getSchemaVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
    await db.close();
  });

  it('creates all five tables', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    const rows = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const names = rows.map((r) => r.name);
    ['products', 'sales', 'sale_items', 'utang_payments', 'settings'].forEach((t) =>
      expect(names).toContain(t),
    );
    await db.close();
  });

  it('is idempotent — running twice does not fail', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await applyMigrations(db);
    expect(await getSchemaVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
    await db.close();
  });

  it('enforces unique barcode', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await db.run(
      "INSERT INTO products (name, price_centavos, barcode, is_generated, created_at) VALUES ('A', 100, 'X1', 0, '2026-05-10')",
    );
    await expect(
      db.run(
        "INSERT INTO products (name, price_centavos, barcode, is_generated, created_at) VALUES ('B', 100, 'X1', 0, '2026-05-10')",
      ),
    ).rejects.toThrow();
    await db.close();
  });
});
```

- [ ] **Step 3: Run tests, confirm fail**

Run: `npm test -- --testPathPattern=migrations`
Expected: FAIL.

- [ ] **Step 4: Implement `src/db/migrations.ts`**

```ts
import type { Database } from '@/db/types';
import { v1Schema } from '@/db/migrationFiles/v1';

export const CURRENT_SCHEMA_VERSION = 1;

const META_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`;

export async function getSchemaVersion(db: Database): Promise<number> {
  await db.exec(META_TABLE_SQL);
  const row = await db.get<{ value: string }>(
    "SELECT value FROM schema_meta WHERE key = 'version'",
  );
  return row ? Number(row.value) : 0;
}

async function setSchemaVersion(db: Database, version: number): Promise<void> {
  await db.run(
    "INSERT INTO schema_meta (key, value) VALUES ('version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [String(version)],
  );
}

export async function applyMigrations(db: Database): Promise<void> {
  const current = await getSchemaVersion(db);
  if (current >= CURRENT_SCHEMA_VERSION) return;

  if (current < 1) {
    await db.exec(v1Schema);
    await setSchemaVersion(db, 1);
  }
}
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm test -- --testPathPattern=migrations`
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/db/migrationFiles/v1.ts src/db/migrations.ts src/__tests__/db/migrations.test.ts
git commit -m "feat(db): add migration runner and v1 schema"
```

---

## Task 11: Settings query module (TDD)

**Files:**
- Create: `src/db/queries/settings.ts`
- Test: `src/__tests__/db/queries/settings.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/db/queries/settings.test.ts`:

```ts
import type { Database } from '@/db/types';
import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import { getSetting, setSetting, getAllSettings } from '@/db/queries/settings';

let db: Database;

beforeEach(async () => {
  db = openTestDatabase();
  await applyMigrations(db);
});

afterEach(async () => {
  await db.close();
});

describe('settings queries', () => {
  it('returns undefined for a missing key', async () => {
    expect(await getSetting(db, 'storeName')).toBeUndefined();
  });

  it('persists a value via setSetting', async () => {
    await setSetting(db, 'storeName', "Aling Pinay's Store");
    expect(await getSetting(db, 'storeName')).toBe("Aling Pinay's Store");
  });

  it('updates an existing key', async () => {
    await setSetting(db, 'textSize', 'medium');
    await setSetting(db, 'textSize', 'large');
    expect(await getSetting(db, 'textSize')).toBe('large');
  });

  it('returns all settings as a map', async () => {
    await setSetting(db, 'textSize', 'large');
    await setSetting(db, 'density', 'spacious');
    const all = await getAllSettings(db);
    expect(all).toEqual({ textSize: 'large', density: 'spacious' });
  });

  it('returns an empty map when no settings exist', async () => {
    expect(await getAllSettings(db)).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `npm test -- --testPathPattern=settings.test`
Expected: FAIL.

- [ ] **Step 3: Implement `src/db/queries/settings.ts`**

```ts
import type { Database } from '@/db/types';

export async function getSetting(db: Database, key: string): Promise<string | undefined> {
  const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? undefined;
}

export async function setSetting(db: Database, key: string, value: string): Promise<void> {
  await db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function getAllSettings(db: Database): Promise<Record<string, string>> {
  const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- --testPathPattern=settings.test`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/db/queries/settings.ts src/__tests__/db/queries/settings.test.ts
git commit -m "feat(db): add settings key/value query module"
```

---

## Task 12: Settings Zustand store (TDD)

**Files:**
- Create: `src/store/settings.ts`
- Test: `src/__tests__/store/settings.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/store/settings.test.ts`:

```ts
import { openTestDatabase } from '@/db/testClient';
import { applyMigrations } from '@/db/migrations';
import { setSetting } from '@/db/queries/settings';
import { useSettingsStore, hydrateSettings, DEFAULT_STORE_NAME } from '@/store/settings';
import { DEFAULT_TEXT_SIZE, DEFAULT_DENSITY } from '@/theme/types';

beforeEach(() => {
  // Reset store to defaults between tests
  useSettingsStore.setState({
    textSize: DEFAULT_TEXT_SIZE,
    density: DEFAULT_DENSITY,
    storeName: DEFAULT_STORE_NAME,
    hydrated: false,
  });
});

describe('settings store', () => {
  it('starts with defaults before hydration', () => {
    const s = useSettingsStore.getState();
    expect(s.textSize).toBe(DEFAULT_TEXT_SIZE);
    expect(s.density).toBe(DEFAULT_DENSITY);
    expect(s.storeName).toBe(DEFAULT_STORE_NAME);
    expect(s.hydrated).toBe(false);
  });

  it('hydrates from the database', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await setSetting(db, 'textSize', 'large');
    await setSetting(db, 'density', 'spacious');
    await setSetting(db, 'storeName', 'My Store');

    await hydrateSettings(db);

    const s = useSettingsStore.getState();
    expect(s.textSize).toBe('large');
    expect(s.density).toBe('spacious');
    expect(s.storeName).toBe('My Store');
    expect(s.hydrated).toBe(true);
    await db.close();
  });

  it('persists on update', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await hydrateSettings(db);

    await useSettingsStore.getState().setTextSize(db, 'xlarge');

    expect(useSettingsStore.getState().textSize).toBe('xlarge');
    const row = await db.get<{ value: string }>(
      "SELECT value FROM settings WHERE key='textSize'",
    );
    expect(row?.value).toBe('xlarge');
    await db.close();
  });

  it('ignores unknown values from the DB', async () => {
    const db = openTestDatabase();
    await applyMigrations(db);
    await setSetting(db, 'textSize', 'gigantic'); // not a valid TextSizeKey

    await hydrateSettings(db);

    expect(useSettingsStore.getState().textSize).toBe(DEFAULT_TEXT_SIZE);
    await db.close();
  });
});
```

- [ ] **Step 2: Run tests, confirm fail**

Run: `npm test -- --testPathPattern=store/settings`
Expected: FAIL.

- [ ] **Step 3: Implement `src/store/settings.ts`**

```ts
import { create } from 'zustand';
import type { Database } from '@/db/types';
import { getAllSettings, setSetting } from '@/db/queries/settings';
import {
  type TextSizeKey,
  type DensityKey,
  TEXT_SIZE_SCALE,
  DENSITY_COLUMNS,
  DEFAULT_TEXT_SIZE,
  DEFAULT_DENSITY,
} from '@/theme/types';

export const DEFAULT_STORE_NAME = 'My Sari-Sari Store';

interface SettingsState {
  textSize: TextSizeKey;
  density: DensityKey;
  storeName: string;
  hydrated: boolean;
  setTextSize: (db: Database, value: TextSizeKey) => Promise<void>;
  setDensity: (db: Database, value: DensityKey) => Promise<void>;
  setStoreName: (db: Database, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  textSize: DEFAULT_TEXT_SIZE,
  density: DEFAULT_DENSITY,
  storeName: DEFAULT_STORE_NAME,
  hydrated: false,
  setTextSize: async (db, value) => {
    await setSetting(db, 'textSize', value);
    set({ textSize: value });
  },
  setDensity: async (db, value) => {
    await setSetting(db, 'density', value);
    set({ density: value });
  },
  setStoreName: async (db, value) => {
    await setSetting(db, 'storeName', value);
    set({ storeName: value });
  },
}));

function isTextSize(v: string | undefined): v is TextSizeKey {
  return v != null && v in TEXT_SIZE_SCALE;
}

function isDensity(v: string | undefined): v is DensityKey {
  return v != null && v in DENSITY_COLUMNS;
}

export async function hydrateSettings(db: Database): Promise<void> {
  const all = await getAllSettings(db);
  useSettingsStore.setState({
    textSize: isTextSize(all.textSize) ? all.textSize : DEFAULT_TEXT_SIZE,
    density: isDensity(all.density) ? all.density : DEFAULT_DENSITY,
    storeName: all.storeName ?? DEFAULT_STORE_NAME,
    hydrated: true,
  });
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- --testPathPattern=store/settings`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/settings.ts src/__tests__/store/settings.test.ts
git commit -m "feat(store): add settings Zustand store with DB hydration"
```

---

## Task 13: Bottom-tab navigator + placeholder screens

**Files:**
- Create: `src/navigation/BottomTabs.tsx`
- Create: `src/screens/sell/SellScreen.tsx`
- Create: `src/screens/products/ProductListScreen.tsx`
- Create: `src/screens/history/HistoryScreen.tsx`
- Create: `src/navigation/SellStack.tsx`
- Create: `src/navigation/ProductsStack.tsx`
- Create: `src/navigation/HistoryStack.tsx`
- Create: `src/navigation/types.ts`

- [ ] **Step 1: Create `src/navigation/types.ts`**

```ts
export type SellStackParamList = {
  SellHome: undefined;
};

export type ProductsStackParamList = {
  ProductList: undefined;
};

export type HistoryStackParamList = {
  HistoryHome: undefined;
  Settings: undefined;
  DisplaySettings: undefined;
};

export type RootTabParamList = {
  Sell: undefined;
  Products: undefined;
  History: undefined;
};
```

- [ ] **Step 2: Create the three placeholder screens**

`src/screens/sell/SellScreen.tsx`:

```tsx
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { palette } from '@/theme/palette';

export function SellScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text variant="headlineMedium">Sell</Text>
      <Text variant="bodyMedium" style={{ marginTop: 8, color: palette.text3, textAlign: 'center' }}>
        Catalog and cart coming in Plan 2.
      </Text>
    </View>
  );
}
```

`src/screens/products/ProductListScreen.tsx`:

```tsx
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { palette } from '@/theme/palette';

export function ProductListScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text variant="headlineMedium">Products</Text>
      <Text variant="bodyMedium" style={{ marginTop: 8, color: palette.text3, textAlign: 'center' }}>
        Catalog management coming in Plan 3.
      </Text>
    </View>
  );
}
```

`src/screens/history/HistoryScreen.tsx`:

```tsx
import { View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { palette } from '@/theme/palette';
import type { HistoryStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<HistoryStackParamList, 'HistoryHome'>;

export function HistoryScreen({ navigation }: { navigation: Nav }) {
  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <Appbar.Header>
        <Appbar.Content title="History" />
        <Appbar.Action icon="cog" onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings" />
      </Appbar.Header>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text variant="bodyMedium" style={{ color: palette.text3, textAlign: 'center' }}>
          Today's transactions and utang ledger come in Plan 4.
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Create the three per-tab stacks**

`src/navigation/SellStack.tsx`:

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SellScreen } from '@/screens/sell/SellScreen';
import type { SellStackParamList } from './types';

const Stack = createNativeStackNavigator<SellStackParamList>();

export function SellStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SellHome" component={SellScreen} />
    </Stack.Navigator>
  );
}
```

`src/navigation/ProductsStack.tsx`:

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductListScreen } from '@/screens/products/ProductListScreen';
import type { ProductsStackParamList } from './types';

const Stack = createNativeStackNavigator<ProductsStackParamList>();

export function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProductList" component={ProductListScreen} />
    </Stack.Navigator>
  );
}
```

`src/navigation/HistoryStack.tsx`:

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryScreen } from '@/screens/history/HistoryScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { DisplaySettingsScreen } from '@/screens/settings/DisplaySettingsScreen';
import type { HistoryStackParamList } from './types';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryHome" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
      <Stack.Screen name="DisplaySettings" component={DisplaySettingsScreen} options={{ headerShown: true, title: 'Display' }} />
    </Stack.Navigator>
  );
}
```

(The Settings screens are created in Tasks 14 and 15. Importing them up-front is fine — they won't be rendered until those screens exist.)

- [ ] **Step 4: Create `src/navigation/BottomTabs.tsx`**

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SellStack } from './SellStack';
import { ProductsStack } from './ProductsStack';
import { HistoryStack } from './HistoryStack';
import type { RootTabParamList } from './types';
import { palette } from '@/theme/palette';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.text2,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12 },
        tabBarIcon: ({ color, size }) => {
          const iconName: Record<keyof RootTabParamList, string> = {
            Sell: 'cart-outline',
            Products: 'package-variant',
            History: 'history',
          };
          return <MaterialCommunityIcons name={iconName[route.name] as any} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Sell" component={SellStack} />
      <Tab.Screen name="Products" component={ProductsStack} />
      <Tab.Screen name="History" component={HistoryStack} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/navigation src/screens/sell src/screens/products src/screens/history
git commit -m "feat(nav): add bottom tabs and placeholder Sell/Products/History screens"
```

---

## Task 14: Settings screen (top-level menu)

**Files:**
- Create: `src/screens/settings/SettingsScreen.tsx`

- [ ] **Step 1: Create `src/screens/settings/SettingsScreen.tsx`**

```tsx
import { ScrollView, View } from 'react-native';
import { List } from 'react-native-paper';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSettingsStore } from '@/store/settings';
import { palette } from '@/theme/palette';
import type { HistoryStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<HistoryStackParamList, 'Settings'>;

const TEXT_SIZE_LABEL: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xlarge: 'Extra Large',
};

const DENSITY_LABEL: Record<string, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  spacious: 'Spacious',
};

export function SettingsScreen({ navigation }: { navigation: Nav }) {
  const { textSize, density, storeName } = useSettingsStore();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.surface }}>
      <List.Section>
        <List.Subheader>Store</List.Subheader>
        <List.Item
          title="Store name"
          description={storeName}
          left={(p) => <List.Icon {...p} icon="storefront-outline" />}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Display</List.Subheader>
        <List.Item
          title="Text size"
          description={TEXT_SIZE_LABEL[textSize]}
          left={(p) => <List.Icon {...p} icon="format-size" />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => navigation.navigate('DisplaySettings')}
        />
        <List.Item
          title="Catalog density"
          description={DENSITY_LABEL[density]}
          left={(p) => <List.Icon {...p} icon="view-grid-outline" />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => navigation.navigate('DisplaySettings')}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>About</List.Subheader>
        <List.Item
          title="App version"
          description="0.1.0 — foundation"
          left={(p) => <List.Icon {...p} icon="information-outline" />}
        />
      </List.Section>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/settings/SettingsScreen.tsx
git commit -m "feat(settings): add top-level settings menu"
```

---

## Task 15: Display Settings screen (text size + density)

**Files:**
- Create: `src/screens/settings/DisplaySettingsScreen.tsx`
- Create: `src/screens/settings/SegmentedControl.tsx`

- [ ] **Step 1: Create `src/screens/settings/SegmentedControl.tsx`**

```tsx
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { palette } from '@/theme/palette';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text
              variant="labelLarge"
              style={[styles.label, active && styles.labelActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: palette.softBg,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  optionActive: {
    backgroundColor: palette.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  label: { color: palette.text3 },
  labelActive: { color: palette.text },
});
```

- [ ] **Step 2: Create `src/screens/settings/DisplaySettingsScreen.tsx`**

```tsx
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSettingsStore } from '@/store/settings';
import { useDatabase } from '@/db/DatabaseProvider';
import { palette } from '@/theme/palette';
import { SegmentedControl } from './SegmentedControl';
import type { TextSizeKey, DensityKey } from '@/theme/types';

const TEXT_SIZE_OPTIONS: { value: TextSizeKey; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'XL' },
];

const DENSITY_OPTIONS: { value: DensityKey; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
];

export function DisplaySettingsScreen() {
  const db = useDatabase();
  const { textSize, density, setTextSize, setDensity } = useSettingsStore();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.surface }} contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.title}>Text size</Text>
        <Text variant="bodySmall" style={styles.subtitle}>How big the words and numbers appear throughout the app.</Text>
        <SegmentedControl
          options={TEXT_SIZE_OPTIONS}
          value={textSize}
          onChange={(v) => { void setTextSize(db, v); }}
        />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.title}>Catalog density</Text>
        <Text variant="bodySmall" style={styles.subtitle}>Fewer big tiles, or more smaller tiles in the Sell tab.</Text>
        <SegmentedControl
          options={DENSITY_OPTIONS}
          value={density}
          onChange={(v) => { void setDensity(db, v); }}
        />
      </View>

      <View style={styles.preview}>
        <Text variant="labelMedium" style={styles.previewLabel}>PREVIEW</Text>
        <View style={styles.previewCard}>
          <Text variant="titleSmall" style={{ flex: 1, color: palette.text }}>Silver Swan Soy Sauce sachet</Text>
          <Text variant="headlineSmall" style={{ color: palette.primary }}>₱5</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  section: { gap: 8 },
  title: { color: palette.text },
  subtitle: { color: palette.text3 },
  preview: { marginTop: 8 },
  previewLabel: { color: palette.accent, marginBottom: 8 },
  previewCard: {
    backgroundColor: palette.card,
    borderColor: palette.borderLight,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/settings/DisplaySettingsScreen.tsx src/screens/settings/SegmentedControl.tsx
git commit -m "feat(settings): add display settings screen with text size and density"
```

---

## Task 16: Database provider + App root with fonts gate

**Files:**
- Create: `src/db/DatabaseProvider.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Create `src/db/DatabaseProvider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Database } from '@/db/types';
import { openExpoDatabase } from '@/db/expoClient';
import { applyMigrations } from '@/db/migrations';
import { hydrateSettings } from '@/store/settings';
import { palette } from '@/theme/palette';

const DatabaseContext = createContext<Database | null>(null);

export function useDatabase(): Database {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used within DatabaseProvider');
  return db;
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opened = await openExpoDatabase();
      await applyMigrations(opened);
      await hydrateSettings(opened);
      if (!cancelled) setDb(opened);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!db) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}
```

- [ ] **Step 2: Replace `App.tsx`**

```tsx
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { DatabaseProvider } from '@/db/DatabaseProvider';
import { BottomTabs } from '@/navigation/BottomTabs';
import { palette } from '@/theme/palette';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <ThemeProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <BottomTabs />
          </NavigationContainer>
        </ThemeProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Run typecheck end-to-end**

Run: `npm run typecheck`
Expected: PASS — no errors. (Forward references from Task 8 now resolve.)

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 5: Commit**

```bash
git add src/db/DatabaseProvider.tsx App.tsx
git commit -m "feat(app): wire database provider, fonts gate, and navigation root"
```

---

## Task 17: Smoke test on device + final commit

**Manual verification — no code changes.**

- [ ] **Step 1: Build the dev client**

Run: `npx expo prebuild --platform android --clean && npx expo run:android`

Expected: APK installs and launches on a connected Android device or emulator. App opens to the Sell tab placeholder.

- [ ] **Step 2: Verify all 3 tabs render**

Tap **Sell**, **Products**, **History** in the bottom nav. Each shows its placeholder text using Plus Jakarta Sans.

Expected: no crashes, fonts visibly different from system default.

- [ ] **Step 3: Verify Settings flow**

On the History tab, tap the gear icon top-right. Settings screen opens. Tap **Text size**. Display screen opens with two segmented controls.

- [ ] **Step 4: Verify text-size persistence**

In Display, tap **XL**. Observe the preview card grow. Force-quit the app. Re-open. Settings → Display → segmented control shows **XL** selected and the preview is still large.

Expected: setting survived restart.

- [ ] **Step 5: Verify density persistence**

Tap **Spacious** in Catalog density. Force-quit and reopen. Setting still **Spacious**.

- [ ] **Step 6: Verify adaptive layout breakpoint (optional, requires tablet emulator)**

Open in a tablet emulator (≥720dp width). The app should look the same as Plan 1 has no tablet-specific layouts yet — but the bottom nav should render full-width without overflow.

- [ ] **Step 7: Final commit if any tweaks needed**

If you fixed anything during smoke test, commit:

```bash
git add -A
git commit -m "fix(foundation): adjust ... per smoke test"
```

Otherwise, tag the foundation milestone:

```bash
git tag -a v0.1.0-foundation -m "Foundation: empty app shell with theme, navigation, settings persistence"
```

---

## Self-Review Checklist (run after writing — done)

- [x] **Spec coverage:** §2 stack ✓ (Task 2), §3 IA skeleton ✓ (Task 13–15), §4 schema ✓ (Task 10), §6 layout breakpoint ✓ (Task 6), §7 theme ✓ (Tasks 7–8), §8 display settings ✓ (Tasks 14–15). DB-backed business logic (Sell, Products, History, Backup) deferred to Plans 2–5 by design.
- [x] **No placeholders:** every step shows actual code or commands. No "TBD" / "TODO" markers.
- [x] **Type consistency:** `Database` interface (Task 9) used by `applyMigrations` (Task 10), settings queries (Task 11), settings store (Task 12), provider (Task 16). `TextSizeKey`/`DensityKey` defined in Task 7, used in Tasks 8/12/14/15. `useSettingsStore` defined in Task 12, consumed in Tasks 8/14/15. `useDatabase` defined in Task 16, consumed in Task 15. No naming drift.
- [x] **TDD where applicable:** money, date, layout, migrations, settings queries, settings store all written test-first. UI/config tasks skip TDD by design.
- [x] **Frequent commits:** each task ends in a commit; total 16 commits across 17 tasks.

---

## What's next (Plans 2–5 preview)

| Plan | Adds | Builds on |
|---|---|---|
| 2. Sell flow | Product seed util, cart store, catalog grid + tile (with long-press preview), cart bar (phone) + cart pane (tablet), Pay sheet, Cash + Utang flows, snackbar Undo (hard delete), today's sales/profit cards | Plan 1 foundation |
| 3. Products management | Product list w/ search, FAB, add/edit form, soft delete, barcode chooser sheet, camera scan, generated barcode SVG + share | Plan 2 (uses cart for testing) |
| 4. History & Utang | Date-filtered transactions list, void (soft), receipt detail, Utang ledger, Mark-paid sheet w/ FIFO + cap | Plan 2 (sales table) |
| 5. Settings & Backup/Restore | Backup JSON serialization, share sheet, restore w/ atomic transaction + validation, last-backup nudge | All prior plans |

End of Plan 1.
