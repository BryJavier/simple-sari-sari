import { useState } from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { useDatabase } from '@/db/DatabaseProvider';
import { voidSale } from '@/db/queries/sales';
import { useAppPalette } from '@/theme/useAppPalette';

interface VoidConfirmDialogProps {
  visible: boolean;
  saleId: number;
  onDismiss: () => void;
  onVoided: () => void;
}

export function VoidConfirmDialog({
  visible,
  saleId,
  onDismiss,
  onVoided,
}: VoidConfirmDialogProps) {
  const db = useDatabase();
  const palette = useAppPalette();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await voidSale(db, saleId);
      onVoided();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Void this transaction?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            The sale will stay in History but be excluded from totals. This cannot be
            undone.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>
            Cancel
          </Button>
          <Button
            onPress={handleConfirm}
            loading={loading}
            disabled={loading}
            textColor={palette.danger}
          >
            Void
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
