import { useMemo, useState } from 'react';
import { View, PanResponder, StyleSheet, Text as RNText } from 'react-native';
import { Modal, Portal, Button, Text } from 'react-native-paper';
import Svg, { Path, Circle } from 'react-native-svg';
import { deriveTokens, hslToHex } from '@/theme/palette';
import { useAppPalette } from '@/theme/useAppPalette';
import { useSettingsStore } from '@/store/settings';
import type { Database } from '@/db/types';

const SIZE = 240;
const CENTER = SIZE / 2;
const OUTER_R = CENTER - 16;
const INNER_R = OUTER_R - 36;
const THUMB_R = (OUTER_R + INNER_R) / 2;
const SEGMENTS = 60;

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function arcPath(startAngle: number, endAngle: number): string {
  const o0 = polarToXY(startAngle, OUTER_R);
  const o1 = polarToXY(endAngle, OUTER_R);
  const i1 = polarToXY(endAngle, INNER_R);
  const i0 = polarToXY(startAngle, INNER_R);
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 0 1 ${o1.x} ${o1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${INNER_R} ${INNER_R} 0 0 0 ${i0.x} ${i0.y}`,
    'Z',
  ].join(' ');
}

const RING_SEGMENTS = Array.from({ length: SEGMENTS }, (_, i) => ({
  path: arcPath((i / SEGMENTS) * 360, ((i + 1) / SEGMENTS) * 360),
  color: hslToHex((i / SEGMENTS) * 360, 80, 55),
}));

interface HuePickerSheetProps {
  visible: boolean;
  onDismiss: () => void;
  db: Database;
}

export function HuePickerSheet({ visible, onDismiss, db }: HuePickerSheetProps) {
  const palette = useAppPalette();
  const { themeCustomHue, themeDarkMode, setThemeCustomHue } = useSettingsStore();
  const [draftHue, setDraftHue] = useState(themeCustomHue);

  const previewPalette = useMemo(() => deriveTokens(draftHue, themeDarkMode), [draftHue, themeDarkMode]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
      onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  function handleTouch(x: number, y: number) {
    const dx = x - CENTER;
    const dy = y - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < INNER_R - 8 || dist > OUTER_R + 8) return;
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    setDraftHue(Math.round(((angleDeg + 90 + 360) % 360)));
  }

  async function handleApply() {
    await setThemeCustomHue(db, draftHue);
    onDismiss();
  }

  const thumbPos = polarToXY(draftHue, THUMB_R);
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <Text variant="titleMedium" style={styles.title}>Custom color</Text>

        <View style={styles.ringContainer} {...panResponder.panHandlers}>
          <Svg width={SIZE} height={SIZE}>
            {RING_SEGMENTS.map((seg, i) => (
              <Path key={i} d={seg.path} fill={seg.color} />
            ))}
            <Circle cx={thumbPos.x} cy={thumbPos.y} r={10} fill="#ffffff" stroke="#00000055" strokeWidth={2} />
          </Svg>
        </View>

        <View style={[styles.preview, { backgroundColor: previewPalette.surface }]}>
          <View style={[styles.previewTile, { backgroundColor: previewPalette.card, borderColor: previewPalette.border }]}>
            <RNText style={[styles.previewTileName, { color: previewPalette.text }]} numberOfLines={1}>
              Milo 3-in-1 sachet
            </RNText>
            <RNText style={[styles.previewTilePrice, { color: previewPalette.accent }]}>₱8</RNText>
          </View>
          <View style={[styles.previewBar, { backgroundColor: previewPalette.card, borderTopColor: previewPalette.border }]}>
            <RNText style={[styles.previewBarText, { color: previewPalette.text3 }]}>1 item</RNText>
            <View style={[styles.previewPayBtn, { backgroundColor: previewPalette.primary }]}>
              <RNText style={styles.previewPayLabel}>Pay</RNText>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button mode="contained" onPress={handleApply}>Apply</Button>
        </View>
      </Modal>
    </Portal>
  );
}

function makeStyles(p: ReturnType<typeof useAppPalette>) {
  return StyleSheet.create({
    container: { marginHorizontal: 24 },
    title: { color: p.text, backgroundColor: p.card, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    ringContainer: { alignItems: 'center', paddingVertical: 8, backgroundColor: p.card },
    preview: { marginHorizontal: 20, marginBottom: 4, borderRadius: 8, overflow: 'hidden' },
    previewTile: {
      margin: 10,
      borderRadius: 8,
      borderWidth: 1,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    previewTileName: { fontSize: 13, fontWeight: '600', flex: 1 },
    previewTilePrice: { fontSize: 14, fontWeight: '800' },
    previewBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      gap: 8,
    },
    previewBarText: { flex: 1, fontSize: 12 },
    previewPayBtn: { borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
    previewPayLabel: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      padding: 16,
      backgroundColor: p.card,
    },
  });
}
