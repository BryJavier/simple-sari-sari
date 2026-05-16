import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Surface, Text, Button } from 'react-native-paper';
import { formatMoney } from '@/utils/money';
import { useAppPalette } from '@/theme/useAppPalette';
import { useCartStore } from '@/store/cart';
import type { Product } from '@/db/types';

interface ProductPreviewSheetProps {
  product: Product | null;
  onDismiss: () => void;
}

export function ProductPreviewSheet({ product, onDismiss }: ProductPreviewSheetProps) {
  const palette = useAppPalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const addItem = useCartStore((s) => s.addItem);

  function handleAdd() {
    if (product) {
      addItem(product);
      onDismiss();
    }
  }

  return (
    <Portal>
      <Modal visible={product !== null} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        {product && (
          <Surface style={styles.surface}>
            <Text variant="titleMedium" style={styles.name}>{product.name}</Text>
            <Text variant="headlineSmall" style={styles.price}>{formatMoney(product.price_centavos)}</Text>
            {product.cost_centavos !== null && (
              <Text variant="bodySmall" style={styles.cost}>Cost: {formatMoney(product.cost_centavos)}</Text>
            )}
            <Button mode="contained" onPress={handleAdd} style={styles.button}>Add to Cart</Button>
          </Surface>
        )}
      </Modal>
    </Portal>
  );
}

function makeStyles(p: ReturnType<typeof useAppPalette>) {
  return StyleSheet.create({
    container: { paddingHorizontal: 24 },
    surface: { padding: 24, borderRadius: 16 },
    name: { color: p.text, marginBottom: 4 },
    price: { color: p.accent, marginBottom: 4 },
    cost: { color: p.text3, marginBottom: 16 },
    button: { marginTop: 12 },
  });
}
