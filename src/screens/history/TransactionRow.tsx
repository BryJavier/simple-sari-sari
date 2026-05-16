import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Menu, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { SaleWithItems } from '@/db/types';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

interface TransactionRowProps {
  sale: SaleWithItems;
  onVoidRequest: (saleId: number) => void;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function TransactionRow({ sale, onVoidRequest }: TransactionRowProps) {
  const navigation = useNavigation<RootNav>();
  const [menuVisible, setMenuVisible] = useState(false);
  const isVoided = sale.voided_at !== null;

  function openReceipt() {
    setMenuVisible(false);
    navigation.push('ReceiptDetail', { saleId: sale.id });
  }

  function requestVoid() {
    setMenuVisible(false);
    onVoidRequest(sale.id);
  }

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <Pressable
          onPress={openReceipt}
          onLongPress={() => setMenuVisible(true)}
          style={[styles.row, isVoided && styles.rowVoided]}
          android_ripple={{ color: palette.borderLight }}
        >
          <Text variant="bodySmall" style={styles.time}>
            {formatTime(sale.created_at)}
          </Text>
          <View style={styles.middle}>
            <View style={[styles.badge, sale.payment_type === 'utang' ? styles.badgeUtang : styles.badgeCash]}>
              <Text variant="labelSmall" style={styles.badgeText}>
                {sale.payment_type === 'cash' ? 'Cash' : 'Utang'}
              </Text>
            </View>
            {sale.customer_name ? (
              <Text variant="bodySmall" style={styles.customer} numberOfLines={1}>
                {sale.customer_name}
              </Text>
            ) : null}
          </View>
          <View style={styles.right}>
            <Text
              variant="titleSmall"
              style={[styles.total, isVoided && styles.totalVoided]}
            >
              {formatMoney(sale.total_centavos)}
            </Text>
            {isVoided && (
              <Text variant="labelSmall" style={styles.voidedLabel}>
                Voided
              </Text>
            )}
          </View>
        </Pressable>
      }
    >
      <Menu.Item onPress={openReceipt} title="View receipt" leadingIcon="receipt" />
      <Divider />
      <Menu.Item
        onPress={requestVoid}
        title="Void this transaction"
        leadingIcon="cancel"
        disabled={isVoided}
        titleStyle={isVoided ? styles.voidMenuDisabled : styles.voidMenuDanger}
      />
    </Menu>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
    gap: 12,
  },
  rowVoided: { opacity: 0.5 },
  time: { color: palette.text3, width: 60 },
  middle: { flex: 1, gap: 4 },
  badge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeCash: { backgroundColor: palette.softBg },
  badgeUtang: { backgroundColor: palette.utangBg },
  badgeText: { color: palette.text },
  customer: { color: palette.text3 },
  right: { alignItems: 'flex-end', gap: 2 },
  total: { color: palette.text, fontVariant: ['tabular-nums'] },
  totalVoided: { textDecorationLine: 'line-through', color: palette.text3 },
  voidedLabel: { color: palette.text3 },
  voidMenuDisabled: { color: palette.muted },
  voidMenuDanger: { color: palette.danger },
});
