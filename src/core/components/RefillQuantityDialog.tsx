import { useEffect, useState } from 'react';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { useT } from '@/src/i18n/useT';

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
  const { t } = useT();
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
        <Dialog.Title>{t('refill.title')}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            {t('refill.howMany', { name: medicationName })}
          </Text>
          <TextInput
            label={t('refill.quantity')}
            value={input}
            onChangeText={setInput}
            keyboardType="numeric"
            mode="outlined"
            accessibilityLabel={t('refill.quantity')}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('common.cancel')}</Button>
          <Button
            mode="contained"
            disabled={!isValid}
            onPress={() => onConfirm(parsed)}
            accessibilityLabel={t('refill.addStock')}
          >
            {t('common.add')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
