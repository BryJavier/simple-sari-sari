import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Modal, Portal, Text, Snackbar, IconButton } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCartStore, cartTotalCentavos } from '@/store/cart';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { Product } from '@/db/types';

interface BarcodeScannerModalProps {
  visible: boolean;
  products: Product[];
  onDismiss: () => void;
}

export function BarcodeScannerModal({
  visible,
  products,
  onDismiss,
}: BarcodeScannerModalProps) {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const [permission, requestPermission] = useCameraPermissions();
  const [snackVisible, setSnackVisible] = useState(false);
  const scanningRef = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!visible) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      scanningRef.current = false;
      return;
    }
    if (permission?.granted) return;
    requestPermission().then((result) => {
      if (!result.granted) onDismissRef.current();
    });
    // intentionally only re-runs when the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const total = cartTotalCentavos(items);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={StyleSheet.absoluteFillObject}
      >
        <View style={styles.root}>
          {/* Top half: live camera */}
          <View style={styles.cameraHalf}>
            {permission?.granted && visible && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={({ data }) => {
                  if (scanningRef.current) return;
                  const product = products.find((p) => p.barcode === data);
                  if (!product) {
                    setSnackVisible(true);
                    scanningRef.current = true;
                    if (debounceTimer.current) clearTimeout(debounceTimer.current);
                    debounceTimer.current = setTimeout(() => {
                      scanningRef.current = false;
                      debounceTimer.current = null;
                    }, 800);
                    return;
                  }
                  scanningRef.current = true;
                  addItem(product);
                  if (debounceTimer.current) clearTimeout(debounceTimer.current);
                  debounceTimer.current = setTimeout(() => {
                    scanningRef.current = false;
                    debounceTimer.current = null;
                  }, 800);
                }}
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr'],
                }}
              />
            )}
            <IconButton
              icon="close"
              iconColor="white"
              size={28}
              style={styles.closeBtn}
              onPress={onDismiss}
            />
          </View>

          {/* Bottom half: scrollable cart list */}
          <View style={styles.cartHalf}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartHeaderText}>
                Cart · {items.length} item{items.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <ScrollView style={styles.cartScroll}>
              {items.map((item) => (
                <View key={item.product.id} style={styles.cartRow}>
                  <View style={styles.cartRowInfo}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemDetail}>
                      {formatMoney(item.product.price_centavos)} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={styles.cartItemTotal}>
                    {formatMoney(item.product.price_centavos * item.quantity)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.doneBtn} onPress={onDismiss}>
              <Text style={styles.doneBtnText}>Done · {formatMoney(total)}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2000}
      >
        Barcode not found
      </Snackbar>
    </Portal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  cameraHalf: { flex: 1, position: 'relative' },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cartHalf: { flex: 1, backgroundColor: palette.card },
  cartHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  cartHeaderText: {
    fontSize: 11,
    color: palette.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cartScroll: { flex: 1 },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  cartRowInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: '600', color: palette.text },
  cartItemDetail: { fontSize: 12, color: palette.text3, marginTop: 2 },
  cartItemTotal: { fontSize: 14, fontWeight: '600', color: palette.primary },
  doneBtn: { backgroundColor: palette.primary, paddingVertical: 14 },
  doneBtnText: {
    color: palette.card,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});
