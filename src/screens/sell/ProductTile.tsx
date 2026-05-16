import { useMemo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { formatMoney } from '@/utils/money';
import { useAppPalette } from '@/theme/useAppPalette';
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
  const palette = useAppPalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
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

function makeStyles(p: ReturnType<typeof useAppPalette>) {
  return StyleSheet.create({
    tile: {
      backgroundColor: p.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: p.border,
      margin: 4,
      minHeight: 72,
      justifyContent: 'space-between',
    },
    name: { color: p.text, flexShrink: 1 },
    price: { color: p.accent, marginTop: 4 },
  });
}
