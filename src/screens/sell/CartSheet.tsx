import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Modal, Portal, Text } from 'react-native-paper';
import { useCartStore, cartTotalCentavos, cartItemCount } from '@/store/cart';
import type { CartItem } from '@/store/cart';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';

interface CartSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onPay: () => void;
}

function CartLineItem({ item }: { item: CartItem }) {
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

export function CartSheet({ visible, onDismiss, onPay }: CartSheetProps) {
  const items = useCartStore((s) => s.items);
  const total = cartTotalCentavos(items);
  const count = cartItemCount(items);

  function handlePay() {
    onDismiss();
    onPay();
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            Cart · {count} item{count !== 1 ? 's' : ''}
          </Text>
          <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>
        <Divider />
        {count === 0 ? (
          <Text variant="bodyMedium" style={styles.empty}>
            Cart is empty
          </Text>
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
              <Text variant="titleMedium" style={styles.total}>
                {formatMoney(total)}
              </Text>
              <View style={styles.footerActions}>
                <Button onPress={onDismiss}>Continue</Button>
                <Button mode="contained" onPress={handlePay}>
                  Pay
                </Button>
              </View>
            </View>
          </>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.card,
    margin: 24,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '75%',
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingVertical: 4 },
  title: { color: palette.text },
  list: { flexGrow: 0 },
  empty: { padding: 24, color: palette.text3, textAlign: 'center' },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemName: { flex: 1, color: palette.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  itemTotal: { width: 80, textAlign: 'right', color: palette.text },
  footer: { padding: 16, gap: 8 },
  total: { color: palette.accent },
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
