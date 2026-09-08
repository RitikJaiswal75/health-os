import { useCallback, useState } from 'react';
import { Button, Dialog, Portal, RadioButton } from 'react-native-paper';
import type { MedicationVariant } from '@/src/db/schema';

interface VariantPickerSheetProps {
  visible: boolean;
  variants: MedicationVariant[];
  title?: string;
  onSelect: (variantId: string) => void;
  onDismiss: () => void;
}

export function VariantPickerSheet({
  visible,
  variants,
  title = 'Which strength?',
  onSelect,
  onDismiss,
}: VariantPickerSheetProps) {
  const [selected, setSelected] = useState<string>(variants[0]?.id ?? '');

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <RadioButton.Group onValueChange={setSelected} value={selected}>
            {variants.map((v) => (
              <RadioButton.Item
                key={v.id}
                label={`${v.label}${v.strengthValue ? ` — ${v.strengthValue} ${v.strengthUnit ?? ''}` : ''} (${v.currentQuantity} left)`}
                value={v.id}
              />
            ))}
          </RadioButton.Group>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            mode="contained"
            disabled={!selected}
            onPress={() => onSelect(selected)}
            accessibilityLabel="Confirm variant"
          >
            Taken
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export function useVariantTakenFlow<TContext = void>(
  getVariants: (medicationId: string) => MedicationVariant[],
  onTaken: (variantId: string, context: TContext | undefined) => void,
) {
  const [visible, setVisible] = useState(false);
  const [medicationId, setMedicationId] = useState('');
  const [pendingContext, setPendingContext] = useState<TContext | undefined>(undefined);

  const requestTaken = useCallback(
    (medId: string, context?: TContext) => {
      const variants = getVariants(medId);
      if (variants.length <= 1) {
        onTaken(variants[0]?.id ?? '', context);
        return;
      }
      setPendingContext(context);
      setMedicationId(medId);
      setVisible(true);
    },
    [getVariants, onTaken],
  );

  const sheet = (
    <VariantPickerSheet
      visible={visible}
      variants={medicationId ? getVariants(medicationId) : []}
      onSelect={(id) => {
        setVisible(false);
        onTaken(id, pendingContext);
        setPendingContext(undefined);
      }}
      onDismiss={() => {
        setVisible(false);
        setPendingContext(undefined);
      }}
    />
  );

  return { requestTaken, sheet };
}
