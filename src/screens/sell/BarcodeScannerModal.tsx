import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Modal, Portal, Text, Snackbar, IconButton } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioPlayer } from 'expo-audio';
import { useCartStore, cartTotalCentavos } from '@/store/cart';
import { formatMoney } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { Product } from '@/db/types';
import { BarcodeViewfinder } from '@/components/BarcodeViewfinder';

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
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const [permission, requestPermission] = useCameraPermissions();
  const [snackVisible, setSnackVisible] = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });
  const beepPlayer = useAudioPlayer(require('../../../assets/sounds/beep.wav'));

  useEffect(() => {
    if (!visible) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      lastScannedRef.current = null;
      setSnackVisible(false);
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
          <View
            style={styles.cameraHalf}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              cameraLayoutRef.current = { width, height };
            }}
          >
            {permission?.granted && visible && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={(e) => {
                  // ROI filter: ignore scans outside the viewfinder rectangle
                  const layout = cameraLayoutRef.current;
                  if (layout && e.cornerPoints && e.cornerPoints.length > 0) {
                    const cx = e.cornerPoints.reduce((s, p) => s + p.x, 0) / e.cornerPoints.length;
                    const cy = e.cornerPoints.reduce((s, p) => s + p.y, 0) / e.cornerPoints.length;
                    const vfLeft = (layout.width - 260) / 2;
                    const vfTop  = (layout.height - 120) / 2;
                    if (cx < vfLeft || cx > vfLeft + 260 || cy < vfTop || cy > vfTop + 120) return;
                  }

                  const trimmed = e.data.trim();
                  if (lastScannedRef.current === trimmed) return;
                  lastScannedRef.current = trimmed;

                  const product = products.find((p) => p.barcode === trimmed);
                  if (!product) {
                    setSnackVisible(true);
                  } else {
                    addItem(product);
                    try { beepPlayer.seekTo(0); beepPlayer.play(); } catch {}
                  }

                  if (debounceTimer.current) clearTimeout(debounceTimer.current);
                  debounceTimer.current = setTimeout(() => {
                    lastScannedRef.current = null;
                    debounceTimer.current = null;
                  }, 3000);
                }}
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr'],
                }}
              />
            )}
            <BarcodeViewfinder />
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
                  <Text style={styles.cartItemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <View style={styles.cartQtyRow}>
                    <IconButton
                      icon="minus"
                      size={16}
                      iconColor={palette.text}
                      onPress={() => decrementItem(item.product.id)}
                    />
                    <Text style={styles.cartQtyText}>{item.quantity}</Text>
                    <IconButton
                      icon="plus"
                      size={16}
                      iconColor={palette.text}
                      onPress={() => incrementItem(item.product.id)}
                    />
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
  cameraHalf: { flex: 1 },
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
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 4,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  cartItemName: { flex: 1, fontSize: 13, fontWeight: '600', color: palette.text },
  cartQtyRow: { flexDirection: 'row', alignItems: 'center' },
  cartQtyText: { fontSize: 13, fontWeight: '600', color: palette.text, minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: '600', color: palette.primary },
  doneBtn: { backgroundColor: palette.primary, paddingVertical: 14 },
  doneBtnText: {
    color: palette.card,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});
