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
