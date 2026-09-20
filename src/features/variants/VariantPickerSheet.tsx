import { useCallback, useState } from 'react';
import { Button, Dialog, Portal, RadioButton } from 'react-native-paper';
import type { MedicationVariant } from '@/src/db/schema';
import { useT } from '@/src/i18n/useT';

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
  title,
  onSelect,
  onDismiss,
}: VariantPickerSheetProps) {
  const { t } = useT();
  const [selected, setSelected] = useState<string>(variants[0]?.id ?? '');
  const heading = title ?? t('variant.title');

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{heading}</Dialog.Title>
        <Dialog.Content>
          <RadioButton.Group onValueChange={setSelected} value={selected}>
            {variants.map((v) => (
              <RadioButton.Item
                key={v.id}
                label={t('variant.left', {
                  label: `${v.label}${v.strengthValue ? ` — ${v.strengthValue} ${v.strengthUnit ?? ''}` : ''}`,
                  count: v.currentQuantity,
                })}
                value={v.id}
              />
            ))}
          </RadioButton.Group>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('common.cancel')}</Button>
          <Button
            mode="contained"
            disabled={!selected}
            onPress={() => onSelect(selected)}
            accessibilityLabel={t('variant.confirm')}
          >
            {t('common.taken')}
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
