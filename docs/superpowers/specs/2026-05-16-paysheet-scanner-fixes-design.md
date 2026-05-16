# PaySheet & Scanner Fixes — Design Spec

> **Date:** 2026-05-16
> **Scope:** Four bug fixes — keyboard overlap in PaySheet, modal close artifact, audio initialisation, and flash toggle. No schema changes.

---

## Bug 1 — PaySheet Keyboard Overlaps Amount Tendered Field

### Problem
When the user taps the "Amount tendered" `TextInput` in the PaySheet cash mode, the Android soft keyboard rises and covers the input field. The user can type but cannot see what they are entering.

### Root Cause
`PaySheet` renders a `Modal` from react-native-paper (via `Portal`) with `contentContainerStyle={{ paddingHorizontal: 24 }}`. The modal content is vertically centred on screen. When the keyboard rises from the bottom, the modal does not shift and the lower portion — where the amount field sits — is hidden behind the keyboard.

### Fix
Two complementary changes:

**1. Add `KeyboardAvoidingView`** around the modal's inner content with `behavior="padding"` on Android and `"padding"` on iOS. This pushes the Surface upward as the keyboard rises.

**2. Wrap the `Surface` content in a `ScrollView`** with `keyboardShouldPersistTaps="handled"`. This allows the user to scroll the modal content when the keyboard is open, ensuring the input and the change row remain visible.

```
Modal (contentContainerStyle: paddingHorizontal 24, justifyContent flex-end on Android)
  └── KeyboardAvoidingView (behavior="padding", flex 1)
        └── ScrollView (keyboardShouldPersistTaps="handled")
              └── Surface (existing content unchanged)
```

On Android, positioning the modal toward the bottom of the screen (`justifyContent: 'flex-end'` on the container, with `marginBottom` instead of full centering) is also considered — this keeps the modal close to where the keyboard appears and reduces the visual jump. However the simpler `KeyboardAvoidingView + ScrollView` approach is preferred to keep the modal visually consistent.

### Imports needed
`KeyboardAvoidingView`, `ScrollView`, `Platform` from `react-native`.

---

## Bug 2 — Black Border Artifact on PaySheet Close

### Problem
After the PaySheet modal dismisses (Cancel, backdrop tap, or post-sale), a brief black-bordered rectangle is visible on screen for ~0.5–1 second before disappearing.

### Root Cause
`PaySheet` wraps its content in react-native-paper's `<Surface>` component. `Surface` applies Material elevation — on Android with the New Architecture, this renders a shadow via the native layer. During the Modal dismiss animation, the Portal tears down the content, but the `Surface` shadow/border renders for a frame or two after the backdrop fades, producing the black box artifact.

### Fix
Replace `<Surface style={styles.surface}>` with a plain `<View style={styles.surface}>`. Add `backgroundColor: palette.card` explicitly to the style so the card background is preserved. The visual result is identical since the `surface` style already has `padding: 24` and `borderRadius: 16`; only the elevation/shadow effect (and its dismiss artifact) is removed.

```tsx
// Before
<Surface style={styles.surface}>

// After
<View style={[styles.surface, styles.surfaceView]}>

// New style:
surfaceView: { backgroundColor: palette.card },
```

---

## Bug 3 — Beep Sound Silent Until Volume Buttons Pressed

### Problem
On first app launch, the beep sound from `expo-audio`'s `useAudioPlayer` does not play when a barcode is scanned or a product is tapped. The user must press the hardware volume buttons (up or down) to "wake" the audio stream, after which the beep works correctly.

### Root Cause
On Android, apps start with no active audio session. The media audio stream is not activated until the system assigns focus. Pressing the volume buttons triggers the system to route audio through the media stream. `expo-audio` does not auto-initialise the audio session on app start — it relies on the app to call `setAudioModeAsync` to configure and activate the session.

### Fix
Call `setAudioModeAsync` from `expo-audio` once at app startup in `App.tsx`:

```tsx
import { setAudioModeAsync } from 'expo-audio';

// Inside App(), in a useEffect on mount:
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

This activates the media audio stream immediately on launch, so the first beep works without requiring user interaction with the volume buttons.

### Placement
`App.tsx` — the root component. Initialising audio mode once at the top level is preferable to initialising it inside individual screen components, which would race if multiple screens mount at the same time.

---

## Bug 4 — No Flash Toggle in Scanner Modal

### Problem
`BarcodeScannerModal` has no way to enable the camera torch/flash. Scanning barcodes in dim environments (common in sari-sari stores) is difficult without a torch.

### Fix
Add a torch toggle button to the camera half of `BarcodeScannerModal`.

**State:** `const [torchEnabled, setTorchEnabled] = useState(false)`

**CameraView prop:** `enableTorch={torchEnabled}` — `expo-camera`'s `CameraView` supports this prop natively.

**UI:** An `IconButton` in the camera half, positioned bottom-left (close button is top-right). Icon: `"flashlight"` when off, `"flashlight-off"` when on — or a simpler single icon `"flash"` with visual active state (highlighted background).

**Reset:** When the modal closes (`visible` becomes false, in the existing cleanup `useEffect`), reset `torchEnabled` to `false` so the torch is off next time the modal opens.

---

## Files Affected

| File | Change |
|------|--------|
| `src/screens/sell/PaySheet.tsx` | Bug 1: `KeyboardAvoidingView` + `ScrollView`; Bug 2: `Surface` → `View` |
| `App.tsx` | Bug 3: `setAudioModeAsync` on mount |
| `src/screens/sell/BarcodeScannerModal.tsx` | Bug 4: `torchEnabled` state, `enableTorch` prop, torch `IconButton` |

No DB migrations, no new dependencies, no navigation changes.

---

## Testing

- **Bug 1:** Open PaySheet, tap Cash, tap "Amount tendered" field → keyboard rises and modal shifts up / scrolls so the field is visible.
- **Bug 2:** Add item, open PaySheet, tap Cancel → modal closes cleanly with no black border flash.
- **Bug 3:** Force-close app, reopen, scan a barcode immediately → beep plays on the first scan without pressing volume buttons.
- **Bug 4:** Open scanner modal → torch button visible in camera area → tap it → camera light turns on → tap again → light turns off → close and reopen modal → torch is off.
