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
