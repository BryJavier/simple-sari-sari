import { Pressable, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import { DENSITY_TILE_PADDING } from '@/theme/types';
import type { DensityKey } from '@/theme/types';
import type { Product } from '@/db/types';

interface ProductTileProps {
  product: Product;
  density: DensityKey;
  onPress: (product: Product) => void;
  onLongPress: (product: Product) => void;
}

export function ProductTile({ product, density, onPress, onLongPress }: ProductTileProps) {
  const pad = DENSITY_TILE_PADDING[density];
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, { padding: pad, opacity: pressed ? 0.7 : 1 }]}
      onPress={() => onPress(product)}
      onLongPress={() => onLongPress(product)}
    >
      <Text variant="labelMedium" numberOfLines={2} style={styles.name}>
        {product.name}
      </Text>
      <Text variant="bodySmall" style={styles.price}>
        {formatMoney(product.price_centavos)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: palette.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    margin: 4,
    minHeight: 72,
    justifyContent: 'space-between',
  },
  name: { color: palette.text, flexShrink: 1 },
  price: { color: palette.accent, marginTop: 4 },
});
