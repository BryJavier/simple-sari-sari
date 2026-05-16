import { useState } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Modal, Portal, Surface, Text, Button, TextInput, SegmentedButtons, Snackbar } from 'react-native-paper';
import { useCartStore, cartTotalCentavos } from '@/store/cart';
import { useDatabase } from '@/db/DatabaseProvider';
import { createSale, voidSale } from '@/db/queries/sales';
import { formatMoney, parseMoney, isValidMoneyInput } from '@/utils/money';
import { palette } from '@/theme/palette';

interface PaySheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSaleComplete: () => void;
}

const DENOMINATION_ROWS = [
  [1, 5, 10],
  [20, 50, 100],
  [200, 500, 1000],
] as const;

export function PaySheet({ visible, onDismiss, onSaleComplete }: PaySheetProps) {
  const db = useDatabase();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [paymentType, setPaymentType] = useState<'cash' | 'utang'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackVisible, setSnackVisible] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [tenderedText, setTenderedText] = useState('');

  const total = cartTotalCentavos(items);
  const tenderedCentavos = (() => {
    if (tenderedText === '') return 0;
    try {
      return parseMoney(tenderedText);
    } catch {
      return 0;
    }
  })();
  const changeCentavos = tenderedCentavos - total;

  const canConfirm =
    !loading &&
    (paymentType === 'utang'
      ? customerName.trim().length > 0
      : tenderedText !== '' && tenderedCentavos >= total);

  function handleDismiss() {
    setTenderedText('');
    setCustomerName('');
    setCustomerPhone('');
    setPaymentType('cash');
    onDismiss();
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const saleId = await createSale(db, {
        items,
        paymentType,
        customerName: paymentType === 'utang' ? customerName.trim() : undefined,
        customerPhone:
          paymentType === 'utang' && customerPhone.trim()
            ? customerPhone.trim()
            : undefined,
      });
      setLastSaleId(saleId);
      clearCart();
      setTenderedText('');
      setCustomerName('');
      setCustomerPhone('');
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
      try {
        await voidSale(db, lastSaleId);
        setLastSaleId(null);
        onSaleComplete();
      } catch (e) {
        console.error('Failed to void sale', e);
      }
    }
    setSnackVisible(false);
  }

  return (
    <>
      <Portal>
        <Modal visible={visible} onDismiss={handleDismiss} contentContainerStyle={styles.container}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
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
                {paymentType === 'cash' && (
                  <>
                    <Text style={styles.denomLabel}>Quick amount</Text>
                    <View style={styles.denomGrid}>
                      {DENOMINATION_ROWS.map((row) => (
                        <View key={row.join('-')} style={styles.denomRow}>
                          {row.map((amount) => {
                            const above = amount * 100 >= total;
                            return (
                              <Pressable
                                key={amount}
                                style={[
                                  styles.denomBtn,
                                  above ? styles.denomBtnAbove : styles.denomBtnBelow,
                                ]}
                                onPress={() => setTenderedText(String(amount))}
                              >
                                <Text style={styles.denomText}>₱{amount}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ))}
                    </View>

                    <TextInput
                      label="Amount tendered (₱)"
                      value={tenderedText}
                      onChangeText={(t) => {
                        if (t === '' || isValidMoneyInput(t)) setTenderedText(t);
                      }}
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />

                    {tenderedText !== '' && (
                      <View
                        style={[
                          styles.changeRow,
                          changeCentavos >= 0 ? styles.changeRowOk : styles.changeRowShort,
                        ]}
                      >
                        <Text style={changeCentavos >= 0 ? styles.changeTextOk : styles.changeTextShort}>
                          {changeCentavos >= 0
                            ? `Change ${formatMoney(changeCentavos)}`
                            : `Short by ${formatMoney(-changeCentavos)}`}
                        </Text>
                      </View>
                    )}
                  </>
                )}
                {paymentType === 'utang' && (
                  <>
                    <TextInput
                      label="Customer name"
                      value={customerName}
                      onChangeText={setCustomerName}
                      style={styles.input}
                      autoFocus
                    />
                    <TextInput
                      label="Contact number — optional"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                  </>
                )}
                <View style={styles.actions}>
                  <Button onPress={handleDismiss}>Cancel</Button>
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
            </ScrollView>
          </KeyboardAvoidingView>
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
  denomLabel: {
    fontSize: 11,
    color: palette.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  denomGrid: { gap: 6, marginBottom: 12 },
  denomRow: { flexDirection: 'row', gap: 6 },
  denomBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  denomBtnAbove: { backgroundColor: palette.softBg, borderColor: palette.border },
  denomBtnBelow: {
    backgroundColor: palette.surface,
    borderColor: palette.borderLight,
    opacity: 0.4,
  },
  denomText: { fontSize: 14, fontWeight: '600', color: palette.primary },
  changeRow: {
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  changeRowOk: { backgroundColor: palette.successBg },
  changeRowShort: { backgroundColor: '#FFEBEE' },
  changeTextOk: { fontSize: 16, fontWeight: '700', color: palette.success },
  changeTextShort: { fontSize: 16, fontWeight: '700', color: palette.danger },
});
