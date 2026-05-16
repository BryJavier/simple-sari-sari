import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Divider, Modal, Portal, Text } from 'react-native-paper';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { generateBarcodeSVGString, isValidEAN13 } from '@/utils/barcode';
import { palette } from '@/theme/palette';
import { EAN13Barcode } from './EAN13Barcode';

interface Props {
  visible: boolean;
  value: string;
  onDismiss: () => void;
}

export function BarcodeDisplaySheet({ visible, value, onDismiss }: Props) {
  const [sharing, setSharing] = useState(false);

  const canRender = isValidEAN13(value);

  async function handleShare() {
    setSharing(true);
    try {
      const svgContent = generateBarcodeSVGString(value);
      const file = new File(Paths.cache, `barcode-${value}.svg`);
      file.write(svgContent);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'image/svg+xml',
        dialogTitle: 'Share barcode label',
        UTI: 'public.svg-image',
      });
    } finally {
      setSharing(false);
    }
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <Text variant="titleMedium" style={styles.title}>
          Barcode
        </Text>
        <Divider style={styles.divider} />

        <View style={styles.barcodeArea}>
          {canRender ? (
            <EAN13Barcode value={value} scale={1.5} />
          ) : (
            <View style={styles.nonEan}>
              <Text variant="bodyLarge" style={styles.nonEanText}>
                {value}
              </Text>
              <Text variant="bodySmall" style={styles.nonEanNote}>
                Not an EAN-13 — display only
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {canRender && (
            <Button
              mode="outlined"
              icon="share-variant"
              onPress={handleShare}
              loading={sharing}
              disabled={sharing}
            >
              Share label
            </Button>
          )}
          <Button mode="text" onPress={onDismiss}>
            Close
          </Button>
        </View>
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
    paddingBottom: 16,
  },
  title: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    color: palette.text,
  },
  divider: { marginBottom: 16 },
  barcodeArea: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nonEan: { alignItems: 'center', gap: 4 },
  nonEanText: { fontFamily: 'monospace', color: palette.text },
  nonEanNote: { color: palette.text3 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
