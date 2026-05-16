import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '@/db/DatabaseProvider';
import { listActiveProducts, seedSampleProducts } from '@/db/queries/products';
import { useCartStore } from '@/store/cart';
import { useIsTablet } from '@/utils/layout';
import { palette } from '@/theme/palette';
import type { RootStackParamList } from '@/navigation/types';
import type { Product } from '@/db/types';
import { TodayCards } from './TodayCards';
import { CatalogGrid } from './CatalogGrid';
import { ProductPreviewSheet } from './ProductPreviewSheet';
import { CartBar } from './CartBar';
import { CartPane } from './CartPane';
import { PaySheet } from './PaySheet';
import { BarcodeScannerModal } from './BarcodeScannerModal';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function SellScreen() {
  const navigation = useNavigation<RootNav>();
  const db = useDatabase();
  const isTablet = useIsTablet();
  const addItem = useCartStore((s) => s.addItem);

  const [products, setProducts] = useState<Product[]>([]);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [payVisible, setPayVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [summaryKey, setSummaryKey] = useState(0);

  useEffect(() => {
    void seedSampleProducts(db);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      listActiveProducts(db).then(setProducts).catch(console.error);
    }, [db]),
  );

  const handleSaleComplete = useCallback(() => {
    setSummaryKey((k) => k + 1);
  }, []);

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.Content title="Sell" />
        <Appbar.Action
          icon="barcode-scan"
          onPress={() => setScannerVisible(true)}
          accessibilityLabel="Scan barcode"
        />
        <Appbar.Action
          icon="cog"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        />
      </Appbar.Header>

      <View style={[styles.body, isTablet && styles.bodyTablet]}>
        <View style={styles.main}>
          <TodayCards refreshKey={summaryKey} />
          <CatalogGrid
            products={products}
            onPress={(p) => addItem(p)}
            onLongPress={(p) => setPreviewProduct(p)}
          />
        </View>
        {isTablet && <CartPane onPay={() => setPayVisible(true)} />}
      </View>

      {!isTablet && <CartBar onPay={() => setPayVisible(true)} />}

      <ProductPreviewSheet
        product={previewProduct}
        onDismiss={() => setPreviewProduct(null)}
      />
      <PaySheet
        visible={payVisible}
        onDismiss={() => setPayVisible(false)}
        onSaleComplete={handleSaleComplete}
      />
      <BarcodeScannerModal
        visible={scannerVisible}
        products={products}
        onDismiss={() => setScannerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  body: { flex: 1 },
  bodyTablet: { flexDirection: 'row' },
  main: { flex: 1 },
});
