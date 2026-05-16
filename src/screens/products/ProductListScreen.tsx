import { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import {
  Appbar,
  FAB,
  List,
  Searchbar,
  Text,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '@/db/DatabaseProvider';
import { listActiveProducts } from '@/db/queries/products';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { ProductsStackParamList } from '@/navigation/types';
import type { RootStackParamList } from '@/navigation/types';
import type { Product } from '@/db/types';

type Nav = NativeStackNavigationProp<ProductsStackParamList & RootStackParamList>;

export function ProductListScreen() {
  const db = useDatabase();
  const navigation = useNavigation<Nav>();

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setProducts(await listActiveProducts(db));
  }, [db]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : products;

  function descriptionFor(p: Product): string {
    const price = formatMoney(p.price_centavos);
    if (p.cost_centavos !== null) {
      return `${price}  ·  cost ${formatMoney(p.cost_centavos)}`;
    }
    return price;
  }

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.Content title="Products" />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        />
      </Appbar.Header>

      <Searchbar
        placeholder="Search products"
        value={query}
        onChangeText={setQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {query ? 'No products match your search.' : 'No products yet. Tap + to add one.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={descriptionFor(item)}
              left={(p) => (
                <List.Icon {...p} icon={item.barcode ? 'barcode-scan' : 'package-variant'} />
              )}
              right={(p) => <List.Icon {...p} icon="chevron-right" />}
              onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('ProductForm', { productId: undefined })}
        accessibilityLabel="Add product"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  searchbar: {
    margin: 12,
    borderRadius: 12,
    backgroundColor: palette.card,
    elevation: 0,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: { fontSize: 14 },
  list: { paddingBottom: 100 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: palette.borderLight },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: palette.text3, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: palette.primary,
  },
});
