import { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, Card, Chip, Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppPalette } from '@/theme/useAppPalette';
import { useDatabase } from '@/db/DatabaseProvider';
import { listSalesByDate } from '@/db/queries/sales';
import { listOutstandingUtang } from '@/db/queries/utang';
import { formatMoney } from '@/utils/money';
import { formatDayLabel } from '@/utils/date';
import { SegmentedControl } from '@/screens/settings/SegmentedControl';
import { TransactionRow } from './TransactionRow';
import { UtangLedger } from './UtangLedger';
import { VoidConfirmDialog } from './VoidConfirmDialog';
import { MarkPaidSheet } from './MarkPaidSheet';
import type { SaleWithItems, UtangCustomer } from '@/db/types';
import type { RootStackParamList } from '@/navigation/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

type Segment = 'transactions' | 'utang';

const SEGMENT_OPTIONS = [
  { value: 'transactions' as const, label: 'Transactions' },
  { value: 'utang' as const, label: 'Utang' },
];

function SummaryCards({
  sales,
  selectedDate,
}: {
  sales: SaleWithItems[];
  selectedDate: Date;
}) {
  const palette = useAppPalette();
  const cardStyles = useMemo(() => makeCardStyles(palette), [palette]);

  const nonVoided = sales.filter((s) => !s.voided_at);
  const totalCentavos = nonVoided.reduce((sum, s) => sum + s.total_centavos, 0);
  const profitCentavos = nonVoided.reduce((sum, s) => {
    return (
      sum +
      s.items.reduce((si, item) => {
        if (item.unit_cost_centavos === null) return si;
        return si + (item.unit_price_centavos - item.unit_cost_centavos) * item.quantity;
      }, 0)
    );
  }, 0);

  const label = formatDayLabel(selectedDate);
  const salesLabel = label === 'Today' ? "Today's Sales" : `Sales · ${label}`;
  const profitLabel = label === 'Today' ? "Today's Profit" : `Profit · ${label}`;

  return (
    <View style={cardStyles.row}>
      <Card style={cardStyles.card}>
        <Card.Content>
          <Text variant="labelSmall" style={cardStyles.cardLabel}>
            {salesLabel.toUpperCase()}
          </Text>
          <Text variant="headlineSmall" style={cardStyles.salesAmount}>
            {formatMoney(totalCentavos)}
          </Text>
        </Card.Content>
      </Card>
      <Card style={cardStyles.card}>
        <Card.Content>
          <Text variant="labelSmall" style={cardStyles.cardLabel}>
            {profitLabel.toUpperCase()}
          </Text>
          <Text variant="headlineSmall" style={cardStyles.profitAmount}>
            {formatMoney(profitCentavos)}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

export function HistoryScreen() {
  const navigation = useNavigation<RootNav>();
  const db = useDatabase();
  const palette = useAppPalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [segment, setSegment] = useState<Segment>('transactions');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [utangCustomers, setUtangCustomers] = useState<UtangCustomer[]>([]);
  const [loading, setLoading] = useState(false);

  const [quickPickVisible, setQuickPickVisible] = useState(false);

  const [voidSaleId, setVoidSaleId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<UtangCustomer | null>(null);

  const loadData = useCallback(
    async (date: Date) => {
      setLoading(true);
      try {
        const [fetchedSales, fetchedUtang] = await Promise.all([
          listSalesByDate(db, date),
          listOutstandingUtang(db),
        ]);
        setSales(fetchedSales);
        setUtangCustomers(fetchedUtang);
      } finally {
        setLoading(false);
      }
    },
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      setSelectedDate(today);
      loadData(today);
    }, [loadData]),
  );

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    setQuickPickVisible(false);
    loadData(date);
  }

  function handleVoided() {
    setVoidSaleId(null);
    loadData(selectedDate);
  }

  function handlePaid() {
    setSelectedCustomer(null);
    listOutstandingUtang(db).then(setUtangCustomers).catch(() => {});
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sevenAgo = new Date(today);
  sevenAgo.setDate(today.getDate() - 7);

  const chipLabel = `${formatDayLabel(selectedDate)} ▾`;

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.Content title="History" />
        <Appbar.Action icon="cog" onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings" />
      </Appbar.Header>

      <View style={styles.segmentRow}>
        <SegmentedControl
          options={SEGMENT_OPTIONS}
          value={segment}
          onChange={setSegment}
        />
      </View>

      {segment === 'transactions' && (
        <>
          <SummaryCards sales={sales} selectedDate={selectedDate} />
          <View style={styles.chipRow}>
            <Chip
              icon="calendar"
              onPress={() => setQuickPickVisible(true)}
              style={styles.chip}
            >
              {chipLabel}
            </Chip>
          </View>
        </>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : segment === 'transactions' ? (
        sales.length === 0 ? (
          <View style={styles.center}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No sales recorded on this day.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sales}
            keyExtractor={(s) => String(s.id)}
            renderItem={({ item }) => (
              <TransactionRow
                sale={item}
                onVoidRequest={(id) => setVoidSaleId(id)}
              />
            )}
          />
        )
      ) : (
        <UtangLedger
          customers={utangCustomers}
          onSelectCustomer={setSelectedCustomer}
        />
      )}

      {quickPickVisible && (
        <View style={styles.quickPickOverlay}>
          <View style={styles.quickPickSheet}>
            <Text variant="titleMedium" style={styles.quickPickTitle}>
              Select date
            </Text>
            <View style={styles.quickPickChips}>
              {[
                { label: 'Today', date: today },
                { label: 'Yesterday', date: yesterday },
                { label: '7 days ago', date: sevenAgo },
              ].map(({ label, date }) => (
                <Chip key={label} onPress={() => handleDateSelect(date)}>
                  {label}
                </Chip>
              ))}
            </View>
            <Chip
              onPress={() => setQuickPickVisible(false)}
              style={styles.quickPickCancel}
            >
              Cancel
            </Chip>
          </View>
        </View>
      )}

      <VoidConfirmDialog
        visible={voidSaleId !== null}
        saleId={voidSaleId ?? 0}
        onDismiss={() => setVoidSaleId(null)}
        onVoided={handleVoided}
      />

      <MarkPaidSheet
        visible={selectedCustomer !== null}
        customer={selectedCustomer}
        onDismiss={() => setSelectedCustomer(null)}
        onPaid={handlePaid}
      />
    </View>
  );
}

function makeCardStyles(p: ReturnType<typeof useAppPalette>) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 12, padding: 16 },
    card: { flex: 1, backgroundColor: p.card },
    cardLabel: { color: p.accent, letterSpacing: 0.6, marginBottom: 4 },
    salesAmount: { color: p.text2, fontVariant: ['tabular-nums'] },
    profitAmount: { color: p.profit, fontVariant: ['tabular-nums'] },
  });
}

function makeStyles(p: ReturnType<typeof useAppPalette>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.surface },
    segmentRow: { paddingHorizontal: 16, paddingVertical: 12 },
    chipRow: { paddingHorizontal: 16, paddingBottom: 8 },
    chip: { alignSelf: 'flex-start' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyText: { color: p.text3, textAlign: 'center' },
    quickPickOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    quickPickSheet: {
      backgroundColor: p.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 24,
      gap: 8,
    },
    quickPickTitle: { color: p.text, marginBottom: 4 },
    quickPickChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    quickPickCancel: { alignSelf: 'flex-start', marginTop: 4 },
  });
}
