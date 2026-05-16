import { useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, IconButton, Button, Divider } from 'react-native-paper';
import { useCartStore, cartTotalCentavos, cartItemCount } from '@/store/cart';
import { formatMoney } from '@/utils/money';
import { useAppPalette } from '@/theme/useAppPalette';
import type { CartItem } from '@/store/cart';

function CartLineItem({ item }: { item: CartItem }) {
  const palette = useAppPalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const increment = useCartStore((s) => s.incrementItem);
  const decrement = useCartStore((s) => s.decrementItem);

  return (
    <View style={styles.lineItem}>
      <Text variant="bodyMedium" style={styles.itemName} numberOfLines={2}>
        {item.product.name}
      </Text>
      <View style={styles.qtyRow}>
        <IconButton icon="minus" size={16} onPress={() => decrement(item.product.id)} />
        <Text variant="bodyMedium">{item.quantity}</Text>
        <IconButton icon="plus" size={16} onPress={() => increment(item.product.id)} />
      </View>
      <Text variant="bodyMedium" style={styles.itemTotal}>
        {formatMoney(item.product.price_centavos * item.quantity)}
      </Text>
    </View>
  );
}

interface CartPaneProps {
  onPay: () => void;
}

export function CartPane({ onPay }: CartPaneProps) {
  const palette = useAppPalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const items = useCartStore((s) => s.items);
  const total = cartTotalCentavos(items);
  const count = cartItemCount(items);

  return (
    <View style={styles.pane}>
      <Text variant="titleMedium" style={styles.header}>Cart</Text>
      <Divider />
      {count === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>Cart is empty</Text>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.product.id)}
            renderItem={({ item }) => <CartLineItem item={item} />}
            style={styles.list}
          />
          <Divider />
          <View style={styles.footer}>
            <Text variant="titleMedium">{formatMoney(total)}</Text>
            <Button mode="contained" onPress={onPay}>Pay</Button>
          </View>
        </>
      )}
    </View>
  );
}

function makeStyles(p: ReturnType<typeof useAppPalette>) {
  return StyleSheet.create({
    pane: { width: 300, backgroundColor: p.card, borderLeftWidth: 1, borderLeftColor: p.border },
    header: { padding: 12, color: p.text },
    list: { flex: 1 },
    empty: { padding: 16, color: p.text3, textAlign: 'center' },
    lineItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
    itemName: { flex: 1, color: p.text },
    qtyRow: { flexDirection: 'row', alignItems: 'center' },
    itemTotal: { width: 80, textAlign: 'right', color: p.text },
    footer: { padding: 12, gap: 8 },
  });
}
