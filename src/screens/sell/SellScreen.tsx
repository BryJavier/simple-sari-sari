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
