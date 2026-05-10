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
