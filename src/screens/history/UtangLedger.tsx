import { FlatList, View, StyleSheet } from 'react-native';
import { List, Text } from 'react-native-paper';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { UtangCustomer } from '@/db/types';

interface UtangLedgerProps {
  customers: UtangCustomer[];
  onSelectCustomer: (customer: UtangCustomer) => void;
}

export function UtangLedger({ customers, onSelectCustomer }: UtangLedgerProps) {
  if (customers.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No outstanding utang. Nice!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={customers}
      keyExtractor={(c) => c.customer_name}
      renderItem={({ item }) => (
        <List.Item
          title={item.customer_name}
          description={item.customer_phone ?? undefined}
          left={(p) => <List.Icon {...p} icon="account" />}
          right={() => (
            <Text variant="titleMedium" style={styles.owed}>
              {formatMoney(item.total_owed_centavos)}
            </Text>
          )}
          onPress={() => onSelectCustomer(item)}
          style={styles.row}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: palette.card },
  owed: { color: palette.utang, fontVariant: ['tabular-nums'], alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: palette.text3, textAlign: 'center' },
});
