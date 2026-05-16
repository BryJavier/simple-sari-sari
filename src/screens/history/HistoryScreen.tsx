import { View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppPalette } from '@/theme/useAppPalette';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function HistoryScreen() {
  const navigation = useNavigation<RootNav>();
  const palette = useAppPalette();

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
