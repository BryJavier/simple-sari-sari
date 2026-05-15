import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Surface, Text, Button, TextInput, SegmentedButtons, Snackbar } from 'react-native-paper';
import { useCartStore, cartTotalCentavos } from '@/store/cart';
import { useDatabase } from '@/db/DatabaseProvider';
import { createSale, voidSale } from '@/db/queries/sales';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';

interface PaySheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSaleComplete: () => void;
}

export function PaySheet({ visible, onDismiss, onSaleComplete }: PaySheetProps) {
  const db = useDatabase();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [paymentType, setPaymentType] = useState<'cash' | 'utang'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackVisible, setSnackVisible] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);

  const total = cartTotalCentavos(items);
  const canConfirm = !loading && (paymentType === 'cash' || customerName.trim().length > 0);

  async function handleConfirm() {
    setLoading(true);
    try {
      const saleId = await createSale(db, {
        items,
        paymentType,
        customerName: paymentType === 'utang' ? customerName.trim() : undefined,
      });
      setLastSaleId(saleId);
      clearCart();
      setCustomerName('');
      setPaymentType('cash');
      onDismiss();
      onSaleComplete();
      setSnackVisible(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleUndo() {
    if (lastSaleId !== null) {
      await voidSale(db, lastSaleId);
      setLastSaleId(null);
      onSaleComplete();
    }
    setSnackVisible(false);
  }

  return (
    <>
      <Portal>
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
          <Surface style={styles.surface}>
            <Text variant="titleMedium" style={styles.title}>
              Payment
            </Text>
            <Text variant="headlineSmall" style={styles.total}>
              {formatMoney(total)}
            </Text>
            <SegmentedButtons
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as 'cash' | 'utang')}
              buttons={[
                { value: 'cash', label: 'Cash' },
                { value: 'utang', label: 'Utang' },
              ]}
              style={styles.tabs}
            />
            {paymentType === 'utang' && (
              <TextInput
                label="Customer name"
                value={customerName}
                onChangeText={setCustomerName}
                style={styles.input}
                autoFocus
              />
            )}
            <View style={styles.actions}>
              <Button onPress={onDismiss}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleConfirm}
                loading={loading}
                disabled={!canConfirm}
              >
                Confirm
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={5000}
        action={{ label: 'Undo', onPress: handleUndo }}
      >
        Sale recorded
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  surface: { padding: 24, borderRadius: 16 },
  title: { marginBottom: 4 },
  total: { color: palette.accent, marginBottom: 16 },
  tabs: { marginBottom: 16 },
  input: { marginBottom: 16, backgroundColor: palette.surface },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
