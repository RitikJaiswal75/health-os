import { Button, Dialog, Portal, Text } from 'react-native-paper';
import {
  type DuplicateMedicationConflict,
  formatDuplicateMedicationMessage,
} from '@/src/features/medications/duplicateMedicationService';

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
  if (!conflict) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Medication already active</Dialog.Title>
        <Dialog.Content>
          <Text>{formatDuplicateMedicationMessage(conflict)}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={onEditExisting}>Edit existing</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
