import { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, Card, Text, Divider, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { useDatabase } from '@/db/DatabaseProvider';
import { getSaleWithItems } from '@/db/queries/sales';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import { VoidConfirmDialog } from './VoidConfirmDialog';
import type { SaleWithItems, SaleItem } from '@/db/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ReceiptDetail'>;
type Route = RouteProp<RootStackParamList, 'ReceiptDetail'>;

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mo = months[d.getMonth()];
  const day = d.getDate();
  const yr = d.getFullYear();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${mo} ${day}, ${yr} · ${h12}:${m} ${ampm}`;
}

function ItemRow({ item }: { item: SaleItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <Text variant="bodyMedium">{item.product_name}</Text>
        <Text variant="bodySmall" style={styles.itemQty}>
          {item.quantity} × {formatMoney(item.unit_price_centavos)}
        </Text>
      </View>
      <Text variant="bodyMedium" style={styles.itemTotal}>
        {formatMoney(item.unit_price_centavos * item.quantity)}
      </Text>
    </View>
  );
}

export function ReceiptDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { saleId } = route.params;
  const db = useDatabase();

  const [sale, setSale] = useState<SaleWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [voidDialogVisible, setVoidDialogVisible] = useState(false);
  const [errorSnack, setErrorSnack] = useState('');

  useEffect(() => {
    getSaleWithItems(db, saleId)
      .then(setSale)
      .catch(() => setErrorSnack('Could not load receipt.'))
      .finally(() => setLoading(false));
  }, [db, saleId]);

  function handleVoided() {
    setVoidDialogVisible(false);
    navigation.goBack();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.center}>
        <Text variant="bodyMedium" style={{ color: palette.text3 }}>
          Could not load receipt.
        </Text>
      </View>
    );
  }

  const isVoided = sale.voided_at !== null;

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Receipt" />
        {!isVoided && (
          <Appbar.Action
            icon="cancel"
            onPress={() => setVoidDialogVisible(true)}
            accessibilityLabel="Void transaction"
          />
        )}
      </Appbar.Header>

      <FlatList
        data={sale.items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <Card style={styles.metaCard}>
            <Card.Content style={styles.metaContent}>
              {isVoided && (
                <View style={styles.voidedBanner}>
                  <Text variant="labelLarge" style={styles.voidedBannerText}>
                    VOIDED
                  </Text>
                </View>
              )}
              <Text variant="bodySmall" style={styles.metaLabel}>
                {formatDateTime(sale.created_at)}
              </Text>
              <Text variant="bodyMedium" style={styles.metaPayment}>
                {sale.payment_type === 'cash' ? 'Cash' : 'Utang'}
                {sale.customer_name ? ` · ${sale.customer_name}` : ''}
              </Text>
            </Card.Content>
            <Divider />
          </Card>
        }
        renderItem={({ item }) => <ItemRow item={item} />}
        ItemSeparatorComponent={() => <Divider style={{ marginHorizontal: 16 }} />}
        ListFooterComponent={
          <>
            <Divider />
            <View style={styles.totalRow}>
              <Text variant="titleMedium">Total</Text>
              <Text
                variant="titleMedium"
                style={[styles.totalAmount, isVoided && styles.voidedText]}
              >
                {formatMoney(sale.total_centavos)}
              </Text>
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      <VoidConfirmDialog
        visible={voidDialogVisible}
        saleId={sale.id}
        onDismiss={() => setVoidDialogVisible(false)}
        onVoided={handleVoided}
      />

      <Snackbar
        visible={!!errorSnack}
        onDismiss={() => setErrorSnack('')}
        duration={3000}
      >
        {errorSnack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaCard: { margin: 0, borderRadius: 0, backgroundColor: palette.card },
  metaContent: { gap: 4, paddingTop: 12, paddingBottom: 12 },
  metaLabel: { color: palette.text3 },
  metaPayment: { color: palette.text },
  voidedBanner: {
    backgroundColor: palette.danger,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  voidedBannerText: { color: '#fff' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: palette.card,
  },
  itemLeft: { flex: 1, gap: 2 },
  itemQty: { color: palette.text3 },
  itemTotal: { color: palette.text, fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: palette.card,
  },
  totalAmount: { fontVariant: ['tabular-nums'] },
  voidedText: { textDecorationLine: 'line-through', color: palette.text3 },
});
