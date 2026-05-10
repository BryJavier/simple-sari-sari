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
