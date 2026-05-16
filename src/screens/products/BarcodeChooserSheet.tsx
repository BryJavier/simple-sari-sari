import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Button,
  Divider,
  List,
  Modal,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { generateEAN13 } from '@/utils/barcode';
import { palette } from '@/theme/palette';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onBarcodeSelected: (barcode: string) => void;
  onScanRequested: () => void;
}

type SheetMode = 'options' | 'manual';

export function BarcodeChooserSheet({
  visible,
  onDismiss,
  onBarcodeSelected,
  onScanRequested,
}: Props) {
  const [mode, setMode] = useState<SheetMode>('options');
  const [manualCode, setManualCode] = useState('');

  function handleDismiss() {
    setMode('options');
    setManualCode('');
    onDismiss();
  }

  function handleManualConfirm() {
    const code = manualCode.trim();
    if (!code) return;
    onBarcodeSelected(code);
    handleDismiss();
  }

  function handleGenerate() {
    onBarcodeSelected(generateEAN13());
    handleDismiss();
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.container}
      >
        <Text variant="titleMedium" style={styles.title}>
          {mode === 'options' ? 'Choose barcode' : 'Enter barcode manually'}
        </Text>
        <Divider style={styles.divider} />

        {mode === 'options' ? (
          <>
            <List.Item
              title="Enter manually"
              description="Type the barcode number"
              left={(p) => <List.Icon {...p} icon="keyboard-outline" />}
              right={(p) => <List.Icon {...p} icon="chevron-right" />}
              onPress={() => setMode('manual')}
            />
            <List.Item
              title="Scan with camera"
              description="Point camera at a barcode"
              left={(p) => <List.Icon {...p} icon="camera-outline" />}
              right={(p) => <List.Icon {...p} icon="chevron-right" />}
              onPress={onScanRequested}
            />
            <List.Item
              title="Generate for me"
              description="Creates an internal EAN-13 code"
              left={(p) => <List.Icon {...p} icon="barcode" />}
              onPress={handleGenerate}
            />
          </>
        ) : (
          <View style={styles.manualContent}>
            <TextInput
              label="Barcode number"
              mode="outlined"
              value={manualCode}
              onChangeText={setManualCode}
              keyboardType="numeric"
              autoFocus
              style={styles.manualInput}
            />
            <View style={styles.manualButtons}>
              <Button onPress={() => setMode('options')}>Back</Button>
              <Button
                mode="contained"
                disabled={!manualCode.trim()}
                onPress={handleManualConfirm}
              >
                Set barcode
              </Button>
            </View>
          </View>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.card,
    margin: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  title: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    color: palette.text,
  },
  divider: { marginBottom: 4 },
  manualContent: { padding: 16, gap: 12 },
  manualInput: { backgroundColor: palette.card },
  manualButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
