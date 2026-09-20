import { Button, Dialog, Portal, Text } from 'react-native-paper';
import {
  type DuplicateMedicationConflict,
  formatDuplicateMedicationMessage,
} from '@/src/features/medications/duplicateMedicationService';
import { useT } from '@/src/i18n/useT';

interface DuplicateMedicationDialogProps {
  visible: boolean;
  conflict: DuplicateMedicationConflict | null;
  onDismiss: () => void;
  onEditExisting: () => void;
}

export function DuplicateMedicationDialog({
  visible,
  conflict,
  onDismiss,
  onEditExisting,
}: DuplicateMedicationDialogProps) {
  const { t } = useT();
  if (!conflict) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{t('duplicate.title')}</Dialog.Title>
        <Dialog.Content>
          <Text>{formatDuplicateMedicationMessage(conflict)}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('common.cancel')}</Button>
          <Button onPress={onEditExisting}>{t('duplicate.editExisting')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
