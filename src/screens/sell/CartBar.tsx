import { View, StyleSheet, Pressable } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useCartStore, cartTotalCentavos, cartItemCount } from '@/store/cart';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';

interface CartBarProps {
  onPay: () => void;
  onViewCart: () => void;
}

export function CartBar({ onPay, onViewCart }: CartBarProps) {
  const items = useCartStore((s) => s.items);
  const total = cartTotalCentavos(items);
  const count = cartItemCount(items);

  if (count === 0) return null;

  return (
    <View style={styles.bar}>
      <Pressable style={styles.info} onPress={onViewCart}>
        <Text variant="labelLarge" style={styles.count}>
          {count} item{count !== 1 ? 's' : ''}
        </Text>
        <Text variant="titleMedium" style={styles.total}>
          {formatMoney(total)}
        </Text>
      </Pressable>
      <Button mode="contained" onPress={onPay} compact>
        Pay
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  count: { color: palette.text3 },
  total: { color: palette.text },
});
