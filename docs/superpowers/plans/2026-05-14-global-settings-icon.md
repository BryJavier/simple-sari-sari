# Global Settings Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Settings gear icon from History-only into every tab's header, and lift the Settings/DisplaySettings screens out of HistoryStack into a root-level navigator so they are reachable from any tab.

**Architecture:** Introduce a new `RootStack` native stack navigator that wraps `BottomTabs` as its first screen and owns the `Settings` and `DisplaySettings` screens. Each tab's root screen gets a gear icon in its `Appbar.Header` that navigates to `Settings` via `useNavigation` typed to `RootStackParamList`. `HistoryStack` is trimmed to only own `HistoryHome`.

**Tech Stack:** React Navigation v6 (native-stack, bottom-tabs), react-native-paper Appbar, TypeScript.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/navigation/types.ts` | Modify | Add `RootStackParamList`; remove `Settings`/`DisplaySettings` from `HistoryStackParamList` |
| `src/navigation/RootStack.tsx` | **Create** | Native stack: `MainTabs` → `BottomTabs`, `Settings`, `DisplaySettings` |
| `App.tsx` | Modify | Swap `<BottomTabs />` for `<RootStack />` |
| `src/navigation/HistoryStack.tsx` | Modify | Remove `Settings` and `DisplaySettings` screens |
| `src/screens/history/HistoryScreen.tsx` | Modify | Update nav type to `RootStackParamList`; gear icon already present |
| `src/screens/sell/SellScreen.tsx` | Modify | Add `Appbar.Header` with title "Sell" and gear icon |
| `src/screens/products/ProductListScreen.tsx` | Modify | Add `Appbar.Header` with title "Products" and gear icon |

---

## Task 1: Update Navigation Types

**Files:**
- Modify: `src/navigation/types.ts`

- [ ] **Step 1: Replace the contents of `types.ts`**

```ts
export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  DisplaySettings: undefined;
};

export type SellStackParamList = {
  SellHome: undefined;
};

export type ProductsStackParamList = {
  ProductList: undefined;
};

export type HistoryStackParamList = {
  HistoryHome: undefined;
};

export type RootTabParamList = {
  Sell: undefined;
  Products: undefined;
  History: undefined;
};
```

- [ ] **Step 2: Verify TypeScript compiles (errors expected in other files — that's fine)**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari"
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors in `HistoryStack.tsx` and `HistoryScreen.tsx` about missing `Settings`/`DisplaySettings` — those get fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/types.ts
git commit -m "refactor(nav): add RootStackParamList, trim HistoryStackParamList"
```

---

## Task 2: Create RootStack Navigator

**Files:**
- Create: `src/navigation/RootStack.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { DisplaySettingsScreen } from '@/screens/settings/DisplaySettingsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Settings' }}
      />
      <Stack.Screen
        name="DisplaySettings"
        component={DisplaySettingsScreen}
        options={{ headerShown: true, title: 'Display' }}
      />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/navigation/RootStack.tsx
git commit -m "feat(nav): create RootStack wrapping BottomTabs with Settings screens"
```

---

## Task 3: Wire RootStack into App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Swap the import and component**

Replace:
```tsx
import { BottomTabs } from '@/navigation/BottomTabs';
```
With:
```tsx
import { RootStack } from '@/navigation/RootStack';
```

Replace inside the return JSX:
```tsx
<BottomTabs />
```
With:
```tsx
<RootStack />
```

The full updated return block:
```tsx
return (
  <SafeAreaProvider>
    <DatabaseProvider>
      <ThemeProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootStack />
        </NavigationContainer>
      </ThemeProvider>
    </DatabaseProvider>
  </SafeAreaProvider>
);
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: still errors in `HistoryStack.tsx` and `HistoryScreen.tsx` — not yet fixed.

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "refactor(app): use RootStack as navigation root"
```

---

## Task 4: Trim HistoryStack

**Files:**
- Modify: `src/navigation/HistoryStack.tsx`

- [ ] **Step 1: Remove Settings and DisplaySettings from the stack**

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryScreen } from '@/screens/history/HistoryScreen';
import type { HistoryStackParamList } from './types';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryHome" component={HistoryScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: error only in `HistoryScreen.tsx` now — fixed next.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/HistoryStack.tsx
git commit -m "refactor(nav): remove Settings screens from HistoryStack"
```

---

## Task 5: Update HistoryScreen Navigation Type

**Files:**
- Modify: `src/screens/history/HistoryScreen.tsx`

- [ ] **Step 1: Replace the file contents**

The gear icon stays, but the nav type now points at `RootStackParamList` via `useNavigation`:

```tsx
import { View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { palette } from '@/theme/palette';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function HistoryScreen() {
  const navigation = useNavigation<RootNav>();

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <Appbar.Header>
        <Appbar.Content title="History" />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        />
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

- [ ] **Step 2: Verify TypeScript is clean**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/history/HistoryScreen.tsx
git commit -m "refactor(history): navigate to Settings via RootStack"
```

---

## Task 6: Add Gear Icon to SellScreen

**Files:**
- Modify: `src/screens/sell/SellScreen.tsx`

- [ ] **Step 1: Add Appbar.Header with gear icon**

```tsx
import { View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { palette } from '@/theme/palette';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function SellScreen() {
  const navigation = useNavigation<RootNav>();

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <Appbar.Header>
        <Appbar.Content title="Sell" />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        />
      </Appbar.Header>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text variant="headlineMedium">Sell</Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, color: palette.text3, textAlign: 'center' }}>
          Catalog and cart coming in Plan 2.
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/sell/SellScreen.tsx
git commit -m "feat(sell): add header with settings gear icon"
```

---

## Task 7: Add Gear Icon to ProductListScreen

**Files:**
- Modify: `src/screens/products/ProductListScreen.tsx`

- [ ] **Step 1: Add Appbar.Header with gear icon**

```tsx
import { View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { palette } from '@/theme/palette';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function ProductListScreen() {
  const navigation = useNavigation<RootNav>();

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <Appbar.Header>
        <Appbar.Content title="Products" />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        />
      </Appbar.Header>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text variant="headlineMedium">Products</Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, color: palette.text3, textAlign: 'center' }}>
          Catalog management coming in Plan 3.
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Verify TypeScript is fully clean**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/screens/products/ProductListScreen.tsx
git commit -m "feat(products): add header with settings gear icon"
```

---

## Task 8: Manual Smoke Test

- [ ] **Step 1: Build and run on Android**

```bash
npx expo run:android
```

- [ ] **Step 2: Verify on each tab**

| Check | Expected |
|---|---|
| Sell tab | Gear icon visible top-right |
| Products tab | Gear icon visible top-right |
| History tab | Gear icon visible top-right |
| Tap gear on Sell | Settings screen opens |
| Tap gear on Products | Settings screen opens |
| Tap gear on History | Settings screen opens |
| Back from Settings | Returns to correct tab |
| Settings → Display Settings | Still works |
