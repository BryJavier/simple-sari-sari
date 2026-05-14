import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useCartStore, cartTotalCentavos, cartItemCount } from '@/store/cart';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';

interface CartBarProps {
  onPay: () => void;
}

export function CartBar({ onPay }: CartBarProps) {
  const items = useCartStore((s) => s.items);
  const total = cartTotalCentavos(items);
  const count = cartItemCount(items);

  if (count === 0) return null;

  return (
    <View style={styles.bar}>
      <Text variant="labelLarge" style={styles.count}>
        {count} item{count !== 1 ? 's' : ''}
      </Text>
      <Text variant="titleMedium" style={styles.total}>
        {formatMoney(total)}
      </Text>
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
  count: { flex: 1, color: palette.text3 },
  total: { color: palette.text },
});
