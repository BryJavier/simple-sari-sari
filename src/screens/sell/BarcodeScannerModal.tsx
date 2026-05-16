import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Modal, Portal, Text, Snackbar, IconButton } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioPlayer } from 'expo-audio';
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
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const [permission, requestPermission] = useCameraPermissions();
  const [snackVisible, setSnackVisible] = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
          <View style={styles.cameraHalf}>
            {permission?.granted && visible && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={({ data }) => {
                  const trimmed = data.trim();
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
            {/* Viewfinder overlay */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <View style={styles.vfTop} />
              <View style={styles.vfMiddle}>
                <View style={styles.vfSide} />
                <View style={styles.vfWindow}>
                  <View style={[styles.vfCorner, styles.vfCornerTL]} />
                  <View style={[styles.vfCorner, styles.vfCornerTR]} />
                  <View style={[styles.vfCorner, styles.vfCornerBL]} />
                  <View style={[styles.vfCorner, styles.vfCornerBR]} />
                </View>
                <View style={styles.vfSide} />
              </View>
              <View style={styles.vfBottom}>
                <Text style={styles.vfLabel}>Point at barcode</Text>
              </View>
            </View>
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
  vfTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  vfMiddle: { flexDirection: 'row', height: 120 },
  vfSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  vfWindow: {
    width: 260,
  },
  vfBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 12,
  },
  vfLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  vfCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
    borderWidth: 3,
  },
  vfCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  vfCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  vfCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  vfCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
});
