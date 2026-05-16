import { ScrollView, View } from 'react-native';
import { List } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSettingsStore } from '@/store/settings';
import { useAppPalette } from '@/theme/useAppPalette';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

const TEXT_SIZE_LABEL: Record<string, string> = {
  small: 'Small', medium: 'Medium', large: 'Large', xlarge: 'Extra Large',
};

const DENSITY_LABEL: Record<string, string> = {
  compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious',
};

export function SettingsScreen() {
  const navigation = useNavigation<RootNav>();
  const palette = useAppPalette();
  const { textSize, density, storeName } = useSettingsStore();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.surface }}>
      <List.Section>
        <List.Subheader>Store</List.Subheader>
        <List.Item title="Store name" description={storeName} left={(p) => <List.Icon {...p} icon="storefront-outline" />} />
      </List.Section>
      <List.Section>
        <List.Subheader>Display</List.Subheader>
        <List.Item title="Text size" description={TEXT_SIZE_LABEL[textSize]} left={(p) => <List.Icon {...p} icon="format-size" />} right={(p) => <List.Icon {...p} icon="chevron-right" />} onPress={() => navigation.navigate('DisplaySettings')} />
        <List.Item title="Catalog density" description={DENSITY_LABEL[density]} left={(p) => <List.Icon {...p} icon="view-grid-outline" />} right={(p) => <List.Icon {...p} icon="chevron-right" />} onPress={() => navigation.navigate('DisplaySettings')} />
      </List.Section>
      <List.Section>
        <List.Subheader>About</List.Subheader>
        <List.Item title="App version" description="0.1.0 — foundation" left={(p) => <List.Icon {...p} icon="information-outline" />} />
      </List.Section>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
