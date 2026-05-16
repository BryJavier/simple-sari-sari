import { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  Divider,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

  // Pre-fill form when editing
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

        <TextInput
          label="Barcode — optional"
          mode="outlined"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="numeric"
          style={styles.field}
        />

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  field: { backgroundColor: palette.card },
  saveButton: { marginTop: 8 },
  divider: { marginVertical: 24 },
  archiveButton: { borderColor: palette.danger },
});
