# PaySheet & Scanner Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four bugs — keyboard overlap in PaySheet, black border artifact on PaySheet close, beep silent on first launch, and no torch toggle in the scanner modal.

**Architecture:** Targeted surgical fixes across three files. No schema changes, no new dependencies, no new components. Each bug is independent and can be fixed in any order.

**Tech Stack:** React Native 0.83.6, Expo SDK 55, TypeScript strict, react-native-paper, expo-audio, expo-camera.

**Spec:** `docs/superpowers/specs/2026-05-16-paysheet-scanner-fixes-design.md`

---

### Task 1: PaySheet — Keyboard Avoidance

**Files:**
- Modify: `src/screens/sell/PaySheet.tsx`

Fix the soft keyboard covering the "Amount tendered" field by wrapping the modal content in `KeyboardAvoidingView` + `ScrollView`.

- [ ] **Step 1: Add imports**

Add `KeyboardAvoidingView`, `ScrollView`, and `Platform` to the existing react-native import line in `PaySheet.tsx`:

```tsx
import { View, StyleSheet, Pressable, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
```

- [ ] **Step 2: Wrap modal content**

In the JSX, the current structure inside `<Modal>` is:

```tsx
<Modal visible={visible} onDismiss={handleDismiss} contentContainerStyle={styles.container}>
  <Surface style={styles.surface}>
    ...
  </Surface>
</Modal>
```

Replace it with:

```tsx
<Modal visible={visible} onDismiss={handleDismiss} contentContainerStyle={styles.container}>
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
    <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
      <Surface style={styles.surface}>
        ...
      </Surface>
    </ScrollView>
  </KeyboardAvoidingView>
</Modal>
```

The existing `Surface` and all its children remain unchanged inside.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit**

```bash
git add src/screens/sell/PaySheet.tsx
git commit -m "fix(paysheet): keyboard avoidance for amount tendered field"
```

---

### Task 2: PaySheet — Remove Black Border Artifact on Close

**Files:**
- Modify: `src/screens/sell/PaySheet.tsx`

Replace `Surface` with a plain `View` to eliminate the elevation shadow artifact that renders briefly during modal dismiss.

- [ ] **Step 1: Remove `Surface` from imports**

In `PaySheet.tsx`, the react-native-paper import line currently includes `Surface`:

```tsx
import { Modal, Portal, Surface, Text, Button, TextInput, SegmentedButtons, Snackbar } from 'react-native-paper';
```

Remove `Surface` from it:

```tsx
import { Modal, Portal, Text, Button, TextInput, SegmentedButtons, Snackbar } from 'react-native-paper';
```

- [ ] **Step 2: Replace Surface with View in JSX**

Find the JSX (after Task 1 the structure is inside `ScrollView`):

```tsx
<Surface style={styles.surface}>
```

Replace with:

```tsx
<View style={[styles.surface, styles.surfaceView]}>
```

And its closing tag:

```tsx
</Surface>
```

becomes:

```tsx
</View>
```

- [ ] **Step 3: Add surfaceView style**

In the `StyleSheet.create({})` block, add a new entry after the existing `surface` entry:

```tsx
surface: { padding: 24, borderRadius: 16 },
surfaceView: { backgroundColor: palette.card },
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/sell/PaySheet.tsx
git commit -m "fix(paysheet): replace Surface with View to remove close artifact"
```

---

### Task 3: Audio — Initialize Media Stream on App Startup

**Files:**
- Modify: `App.tsx`

Call `setAudioModeAsync` once at mount so the Android media audio stream is active before the first barcode scan or product tap.

- [ ] **Step 1: Add imports**

In `App.tsx`, add two imports after the existing react-native imports:

```tsx
import { useEffect } from 'react';
import { setAudioModeAsync } from 'expo-audio';
```

The existing import block at the top of `App.tsx` does not yet import `useEffect` or `expo-audio`. The file currently starts with:

```tsx
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
```

Add both new imports after the react-native line.

- [ ] **Step 2: Add useEffect in App()**

Inside the `App()` function, add a `useEffect` call before the early return guards. The best placement is right after the `useFonts` call (line 19) and before the `if (fontError)` check:

```tsx
useEffect(() => {
  setAudioModeAsync({
    playsInSilentModeIOS: false,
    interruptionModeAndroid: 'duckOthers',
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    staysActiveInBackground: false,
  }).catch(() => {});
}, []);
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "fix(audio): initialize media stream on app startup"
```

---

### Task 4: BarcodeScannerModal — Torch Toggle Button

**Files:**
- Modify: `src/screens/sell/BarcodeScannerModal.tsx`

Add a `torchEnabled` state, wire it to `CameraView`'s `enableTorch` prop, and render a toggle `IconButton` in the camera half.

- [ ] **Step 1: Add torchEnabled state**

In `BarcodeScannerModal.tsx`, after the existing state declarations (`snackVisible`), add:

```tsx
const [torchEnabled, setTorchEnabled] = useState(false);
```

- [ ] **Step 2: Reset torch on modal close**

The existing cleanup `useEffect` runs when `visible` becomes false. Add the torch reset inside it:

```tsx
useEffect(() => {
  if (!visible) {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    lastScannedRef.current = null;
    setSnackVisible(false);
    setTorchEnabled(false);   // ← add this line
    return;
  }
  if (permission?.granted) return;
  requestPermission().then((result) => {
    if (!result.granted) onDismissRef.current();
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [visible]);
```

- [ ] **Step 3: Add enableTorch prop to CameraView**

The `<CameraView>` element currently has these props:

```tsx
<CameraView
  style={StyleSheet.absoluteFillObject}
  onBarcodeScanned={(e) => { ... }}
  barcodeScannerSettings={{ ... }}
/>
```

Add `enableTorch={torchEnabled}`:

```tsx
<CameraView
  style={StyleSheet.absoluteFillObject}
  enableTorch={torchEnabled}
  onBarcodeScanned={(e) => { ... }}
  barcodeScannerSettings={{ ... }}
/>
```

- [ ] **Step 4: Add torch IconButton**

The camera half currently has `<BarcodeViewfinder />` and the close `IconButton` (top-right). Add a second `IconButton` for the torch, bottom-left:

```tsx
<IconButton
  icon={torchEnabled ? 'flashlight-off' : 'flashlight'}
  iconColor="white"
  size={28}
  style={styles.torchBtn}
  onPress={() => setTorchEnabled((v) => !v)}
/>
```

Place it after `<BarcodeViewfinder />` and before (or after) the close `IconButton` — order in JSX doesn't matter since both are `position: 'absolute'`.

- [ ] **Step 5: Add torchBtn style**

In `StyleSheet.create({})`, add after the `closeBtn` style:

```tsx
torchBtn: {
  position: 'absolute',
  bottom: 8,
  left: 8,
  backgroundColor: 'rgba(0,0,0,0.4)',
},
```

- [ ] **Step 6: Verify no TypeScript errors**

```bash
cd "/Volumes/bryan-ssd/bryan-files/Freelance/Simple Sari Sari/simple-sari-sari" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/screens/sell/BarcodeScannerModal.tsx
git commit -m "feat(scanner): add torch toggle button"
```

---

## Testing Checklist

- **Bug 1 (keyboard):** Open PaySheet → tap Cash → tap "Amount tendered" field → keyboard rises → modal/content scrolls up so field remains visible.
- **Bug 2 (artifact):** Add item to cart → open PaySheet → tap Cancel → modal closes cleanly with no black border flash.
- **Bug 3 (audio):** Force-close app → reopen → scan a barcode immediately → beep plays without pressing volume buttons first.
- **Bug 4 (torch):** Open scanner modal → torch button visible bottom-left in camera area → tap it → camera light turns on → tap again → light turns off → close modal and reopen → torch is off by default.
