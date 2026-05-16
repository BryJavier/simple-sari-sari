import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { useSettingsStore } from '@/store/settings';
import { useDatabase } from '@/db/DatabaseProvider';
import { useAppPalette } from '@/theme/useAppPalette';
import { PRESET_HUES, type ThemePreset } from '@/theme/types';
import { deriveTokens } from '@/theme/palette';
import { SegmentedControl } from './SegmentedControl';
import { HuePickerSheet } from './HuePickerSheet';
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

const PRESET_ORDER: Exclude<ThemePreset, 'custom'>[] = ['default', 'ocean', 'forest', 'rose', 'sunset'];
const PRESET_LABELS: Record<Exclude<ThemePreset, 'custom'>, string> = {
  default: 'Default',
  ocean: 'Ocean',
  forest: 'Forest',
  rose: 'Rose',
  sunset: 'Sunset',
};

export function DisplaySettingsScreen() {
  const db = useDatabase();
  const palette = useAppPalette();
  const {
    textSize, density, themePreset, themeCustomHue, themeDarkMode,
    setTextSize, setDensity, setThemePreset, setThemeDarkMode,
  } = useSettingsStore();
  const [huePickerVisible, setHuePickerVisible] = useState(false);
  const styles = useMemo(() => makeStyles(palette), [palette]);

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

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.title}>Color theme</Text>
        <Text variant="bodySmall" style={styles.subtitle}>Choose a color for the app.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {PRESET_ORDER.map((preset) => {
            const presetPalette = deriveTokens(PRESET_HUES[preset], themeDarkMode);
            const active = themePreset === preset;
            return (
              <Pressable
                key={preset}
                style={[styles.chip, active && styles.chipActive, { borderColor: active ? palette.primary : palette.border }]}
                onPress={() => { void setThemePreset(db, preset); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.chipSwatch, { backgroundColor: presetPalette.primary }]} />
                <Text variant="labelSmall" style={[styles.chipLabel, { color: active ? palette.primary : palette.text3 }]}>
                  {PRESET_LABELS[preset]}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.chip, themePreset === 'custom' && styles.chipActive, { borderColor: themePreset === 'custom' ? palette.primary : palette.border }]}
            onPress={() => { void setThemePreset(db, 'custom'); setHuePickerVisible(true); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: themePreset === 'custom' }}
          >
            <View style={[styles.chipSwatch, { backgroundColor: deriveTokens(themeCustomHue, themeDarkMode).primary }]} />
            <Text variant="labelSmall" style={[styles.chipLabel, { color: themePreset === 'custom' ? palette.primary : palette.text3 }]}>
              Custom…
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text variant="titleMedium" style={styles.title}>Dark mode</Text>
            <Text variant="bodySmall" style={styles.subtitle}>Switch to a dark background.</Text>
          </View>
          <Switch
            value={themeDarkMode}
            onValueChange={(v) => { void setThemeDarkMode(db, v); }}
          />
        </View>
      </View>

      <View style={styles.preview}>
        <Text variant="labelMedium" style={styles.previewLabel}>PREVIEW</Text>
        <View style={styles.previewCard}>
          <Text variant="titleSmall" style={{ flex: 1, color: palette.text }}>Silver Swan Soy Sauce sachet</Text>
          <Text variant="headlineSmall" style={{ color: palette.primary }}>₱5</Text>
        </View>
      </View>

      <HuePickerSheet
        visible={huePickerVisible}
        onDismiss={() => setHuePickerVisible(false)}
        db={db}
      />
    </ScrollView>
  );
}

function makeStyles(p: ReturnType<typeof useAppPalette>) {
  return StyleSheet.create({
    container: { padding: 16, gap: 24 },
    section: { gap: 8 },
    title: { color: p.text },
    subtitle: { color: p.text3 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleText: { flex: 1 },
    chipRow: { gap: 8, paddingVertical: 4 },
    chip: {
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      backgroundColor: p.card,
      minWidth: 64,
    },
    chipActive: { backgroundColor: p.softBg },
    chipSwatch: { width: 28, height: 28, borderRadius: 14 },
    chipLabel: {},
    preview: { marginTop: 8 },
    previewLabel: { color: p.accent, marginBottom: 8 },
    previewCard: {
      backgroundColor: p.card,
      borderColor: p.borderLight,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
  });
}
