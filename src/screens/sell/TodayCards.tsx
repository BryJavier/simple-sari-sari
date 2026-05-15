import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '@/db/DatabaseProvider';
import { todaySalesSummary } from '@/db/queries/sales';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { TodaySummary } from '@/db/types';

const ZERO: TodaySummary = { salesCount: 0, totalCentavos: 0, profitCentavos: 0 };

interface TodayCardsProps {
  refreshKey?: number;
}

export function TodayCards({ refreshKey = 0 }: TodayCardsProps) {
  const db = useDatabase();
  const [summary, setSummary] = useState<TodaySummary>(ZERO);

  const refresh = useCallback(async () => {
    const s = await todaySalesSummary(db);
    setSummary(s);
  }, [db]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    if (refreshKey > 0) refresh();
  }, [refresh, refreshKey]);

  return (
    <View style={styles.row}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelSmall" style={styles.label}>Sales</Text>
          <Text variant="titleLarge">{summary.salesCount}</Text>
        </Card.Content>
      </Card>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelSmall" style={styles.label}>Total</Text>
          <Text variant="titleLarge">{formatMoney(summary.totalCentavos)}</Text>
        </Card.Content>
      </Card>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelSmall" style={styles.label}>Profit</Text>
          <Text variant="titleLarge" style={{ color: palette.profit }}>
            {formatMoney(summary.profitCentavos)}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  card: { flex: 1, backgroundColor: palette.card },
  label: { color: palette.text3, marginBottom: 2 },
});
