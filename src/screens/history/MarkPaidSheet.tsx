import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Surface, Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useDatabase } from '@/db/DatabaseProvider';
import { getCustomerSales, recordUtangPayments } from '@/db/queries/utang';
import { allocateFIFO } from '@/utils/fifo';
import { formatMoney, formatMoneyEdit, parseMoney, isValidMoneyInput } from '@/utils/money';
import { useAppPalette } from '@/theme/useAppPalette';
import type { UtangCustomer, UnpaidSale } from '@/db/types';

interface MarkPaidSheetProps {
  visible: boolean;
  customer: UtangCustomer | null;
  onDismiss: () => void;
  onPaid: () => void;
}

export function MarkPaidSheet({ visible, customer, onDismiss, onPaid }: MarkPaidSheetProps) {
  const db = useDatabase();
  const palette = useAppPalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [amountText, setAmountText] = useState('');
  const [unpaidSales, setUnpaidSales] = useState<UnpaidSale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !customer) {
      setAmountText('');
      setUnpaidSales([]);
      return;
    }
    setLoadingSales(true);
    getCustomerSales(db, customer.customer_name)
      .then(setUnpaidSales)
      .catch(() => onDismiss())
      .finally(() => setLoadingSales(false));
  }, [visible, customer, db]);

  if (!customer) return null;

  const totalOwed = customer.total_owed_centavos;
  const enteredCentavos = (() => {
    try { return amountText ? parseMoney(amountText) : 0; } catch { return -1; }
  })();
  const isOverpayment = enteredCentavos > totalOwed;
  const canConfirm =
    !submitting &&
    !loadingSales &&
    enteredCentavos > 0 &&
    !isOverpayment &&
    isValidMoneyInput(amountText);

  async function handleConfirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      const allocations = allocateFIFO(unpaidSales, enteredCentavos);
      await recordUtangPayments(db, allocations);
      onPaid();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <Surface style={styles.surface} elevation={2}>
          <Text variant="titleLarge" style={styles.name}>
            {customer.customer_name}
          </Text>
          <Text variant="bodySmall" style={styles.owedLabel}>
            Outstanding balance
          </Text>
          <Text variant="headlineMedium" style={styles.owedAmount}>
            {formatMoney(totalOwed)}
          </Text>

          {loadingSales ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : (
            <>
              <Button
                mode="outlined"
                compact
                onPress={() => setAmountText(formatMoneyEdit(totalOwed))}
                style={styles.allButton}
              >
                {`All ${formatMoney(totalOwed)}`}
              </Button>

              <TextInput
                label="Amount paid (₱)"
                value={amountText}
                onChangeText={(t) => { if (isValidMoneyInput(t)) setAmountText(t); }}
                keyboardType="decimal-pad"
                mode="outlined"
                style={styles.input}
                error={isOverpayment}
              />

              {isOverpayment && (
                <Text variant="bodySmall" style={styles.error}>
                  {`Cannot pay more than ${formatMoney(totalOwed)} owed.`}
                </Text>
              )}

              <View style={styles.actions}>
                <Button onPress={onDismiss} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleConfirm}
                  loading={submitting}
                  disabled={!canConfirm}
                >
                  Confirm payment
                </Button>
              </View>
            </>
          )}
        </Surface>
      </Modal>
    </Portal>
  );
}

function makeStyles(p: ReturnType<typeof useAppPalette>) {
  return StyleSheet.create({
    container: { paddingHorizontal: 24 },
    surface: { borderRadius: 16, padding: 24, gap: 8 },
    name: { color: p.text },
    owedLabel: { color: p.text3, marginTop: 4 },
    owedAmount: { color: p.utang, fontVariant: ['tabular-nums'] },
    allButton: { alignSelf: 'flex-start', marginTop: 8 },
    input: { marginTop: 8, backgroundColor: p.card },
    error: { color: p.danger },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  });
}
