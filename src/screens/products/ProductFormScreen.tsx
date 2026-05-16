import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Text,
  TextInput,
  Modal,
} from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDatabase } from '@/db/DatabaseProvider';
import {
  getProduct,
  createProduct,
  updateProduct,
  archiveProduct,
} from '@/db/queries/products';
import { parseMoney, formatMoneyShort, isValidMoneyInput } from '@/utils/money';
import { palette } from '@/theme/palette';
import type { ProductsStackParamList } from '@/navigation/types';
import { BarcodeChooserSheet } from './BarcodeChooserSheet';
import { BarcodeDisplaySheet } from './BarcodeDisplaySheet';

type Nav = NativeStackNavigationProp<ProductsStackParamList, 'ProductForm'>;
type Route = RouteProp<ProductsStackParamList, 'ProductForm'>;

export function ProductFormScreen() {
  const db = useDatabase();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const productId = route.params?.productId;
  const isEdit = productId !== undefined;

  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [costText, setCostText] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [archiveDialogVisible, setArchiveDialogVisible] = useState(false);
  const [barcodeChooserVisible, setBarcodeChooserVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [barcodeDisplayVisible, setBarcodeDisplayVisible] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const product = await getProduct(db, productId);
      if (!product) return;
      setName(product.name);
      setPriceText(formatMoneyShort(product.price_centavos));
      setCostText(product.cost_centavos !== null ? formatMoneyShort(product.cost_centavos) : '');
      setBarcode(product.barcode ?? '');
    })();
  }, [db, isEdit, productId]);

  const nameValid = name.trim().length > 0;
  const priceValid = isValidMoneyInput(priceText) && priceText !== '' && parseMoney(priceText) > 0;
  const costValid = costText === '' || (isValidMoneyInput(costText) && parseMoney(costText) > 0);
  const canSave = !loading && nameValid && priceValid && costValid;

  async function handleSave() {
    if (!canSave) return;
    setLoading(true);
    try {
      const input = {
        name: name.trim(),
        price_centavos: parseMoney(priceText),
        cost_centavos: costText.trim() ? parseMoney(costText) : null,
        barcode: barcode.trim() || null,
      };
      if (isEdit) {
        await updateProduct(db, productId, input);
      } else {
        await createProduct(db, input);
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!isEdit) return;
    setLoading(true);
    try {
      await archiveProduct(db, productId);
      setArchiveDialogVisible(false);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleScanRequested() {
    setBarcodeChooserVisible(false);
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    setCameraVisible(true);
  }

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEdit ? 'Edit Product' : 'Add Product'} />
        <Appbar.Action
          icon="check"
          disabled={!canSave}
          onPress={handleSave}
          accessibilityLabel="Save"
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          label="Product name *"
          mode="outlined"
          value={name}
          onChangeText={setName}
          style={styles.field}
          autoFocus={!isEdit}
        />

        <TextInput
          label="Selling price (₱) *"
          mode="outlined"
          value={priceText}
          onChangeText={(t) => {
            if (isValidMoneyInput(t)) setPriceText(t);
          }}
          keyboardType="decimal-pad"
          style={styles.field}
        />

        <TextInput
          label="Cost price (₱) — optional"
          mode="outlined"
          value={costText}
          onChangeText={(t) => {
            if (t === '' || isValidMoneyInput(t)) setCostText(t);
          }}
          keyboardType="decimal-pad"
          style={styles.field}
        />

        {/* Barcode field */}
        <View style={styles.barcodeRow}>
          <View style={styles.barcodeInfo}>
            <Text variant="labelMedium" style={styles.barcodeLabel}>Barcode</Text>
            <Text
              variant="bodyMedium"
              style={barcode ? styles.barcodeValue : styles.barcodePlaceholder}
            >
              {barcode || 'Not set'}
            </Text>
          </View>
          <View style={styles.barcodeButtons}>
            {barcode ? (
              <Button compact mode="text" onPress={() => setBarcodeDisplayVisible(true)}>
                View
              </Button>
            ) : null}
            <Button
              mode="outlined"
              compact
              onPress={() => setBarcodeChooserVisible(true)}
            >
              Choose
            </Button>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          disabled={!canSave}
          loading={loading}
          style={styles.saveButton}
        >
          {isEdit ? 'Save changes' : 'Add product'}
        </Button>

        {isEdit && (
          <>
            <Divider style={styles.divider} />
            <Button
              mode="outlined"
              textColor={palette.danger}
              onPress={() => setArchiveDialogVisible(true)}
              style={styles.archiveButton}
            >
              Archive product
            </Button>
          </>
        )}
      </ScrollView>

      {/* Barcode chooser sheet */}
      <BarcodeChooserSheet
        visible={barcodeChooserVisible}
        onDismiss={() => setBarcodeChooserVisible(false)}
        onBarcodeSelected={(b) => {
          setBarcode(b);
          setBarcodeChooserVisible(false);
        }}
        onScanRequested={handleScanRequested}
      />

      {/* Camera modal */}
      <Portal>
        <Modal
          visible={cameraVisible}
          onDismiss={() => setCameraVisible(false)}
          contentContainerStyle={StyleSheet.absoluteFillObject}
        >
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={({ data }) => {
              setBarcode(data);
              setCameraVisible(false);
            }}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr'],
            }}
          />
          <IconButton
            icon="close"
            iconColor="white"
            size={32}
            style={styles.cameraClose}
            onPress={() => setCameraVisible(false)}
          />
        </Modal>
      </Portal>

      {/* Archive confirmation dialog */}
      <Portal>
        <Dialog
          visible={archiveDialogVisible}
          onDismiss={() => setArchiveDialogVisible(false)}
        >
          <Dialog.Title>Archive product?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              "{name}" will be removed from the catalog. Past sales are not affected.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setArchiveDialogVisible(false)}>Cancel</Button>
            <Button textColor={palette.danger} onPress={handleArchive} loading={loading}>
              Archive
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Barcode display sheet */}
      <BarcodeDisplaySheet
        visible={barcodeDisplayVisible}
        value={barcode}
        onDismiss={() => setBarcodeDisplayVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  field: { backgroundColor: palette.card },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.card,
    gap: 12,
  },
  barcodeInfo: { flex: 1 },
  barcodeButtons: { flexDirection: 'row', alignItems: 'center' },
  barcodeLabel: { color: palette.text3, marginBottom: 2 },
  barcodeValue: { color: palette.text, fontFamily: 'monospace' },
  barcodePlaceholder: { color: palette.muted },
  saveButton: { marginTop: 8 },
  divider: { marginVertical: 24 },
  archiveButton: { borderColor: palette.danger },
  cameraClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
