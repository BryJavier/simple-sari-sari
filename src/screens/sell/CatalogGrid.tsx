import { FlatList, View } from 'react-native';
import { ProductTile } from './ProductTile';
import { useSettingsStore } from '@/store/settings';
import { useIsTablet } from '@/utils/layout';
import { DENSITY_COLUMNS } from '@/theme/types';
import type { Product } from '@/db/types';

interface CatalogGridProps {
  products: Product[];
  onPress: (product: Product) => void;
  onLongPress: (product: Product) => void;
}

export function CatalogGrid({ products, onPress, onLongPress }: CatalogGridProps) {
  const density = useSettingsStore((s) => s.density);
  const isTablet = useIsTablet();
  const numColumns = DENSITY_COLUMNS[density][isTablet ? 'tablet' : 'phone'];

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => String(item.id)}
      numColumns={numColumns}
      key={numColumns}
      contentContainerStyle={{ padding: 4 }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 / numColumns }}>
          <ProductTile
            product={item}
            density={density}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        </View>
      )}
    />
  );
}
