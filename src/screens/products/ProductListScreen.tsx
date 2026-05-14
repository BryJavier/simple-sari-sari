import { View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { palette } from '@/theme/palette';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function ProductListScreen() {
  const navigation = useNavigation<RootNav>();

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <Appbar.Header>
        <Appbar.Content title="Products" />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        />
      </Appbar.Header>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text variant="headlineMedium">Products</Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, color: palette.text3, textAlign: 'center' }}>
          Catalog management coming in Plan 3.
        </Text>
      </View>
    </View>
  );
}
