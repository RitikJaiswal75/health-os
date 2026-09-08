import { useEffect, useState } from 'react';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';

interface RefillQuantityDialogProps {
  visible: boolean;
  medicationName: string;
  onDismiss: () => void;
  onConfirm: (quantity: number) => void;
}

export function RefillQuantityDialog({
  visible,
  medicationName,
  onDismiss,
  onConfirm,
}: RefillQuantityDialogProps) {
  const [input, setInput] = useState('');

  useEffect(() => {
    if (visible) {
      setInput('');
    }
  }, [visible]);

  const parsed = parseInt(input, 10);
  const isValid = Number.isFinite(parsed) && parsed > 0;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Add refill</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            How many did you purchase for {medicationName}?
          </Text>
          <TextInput
            label="Quantity purchased"
            value={input}
            onChangeText={setInput}
            keyboardType="numeric"
            mode="outlined"
            accessibilityLabel="Quantity purchased"
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            mode="contained"
            disabled={!isValid}
            onPress={() => onConfirm(parsed)}
            accessibilityLabel="Add to stock"
          >
            Add
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
