import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, RadioButton, Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { MedicationTypeDialog } from '@/src/core/components/MedicationTypeDialog';
import {
  getMedicationTypeLabel,
  STRENGTH_UNITS,
  type MedicationType,
  type StrengthUnit,
} from '@/src/core/types/domain';
import { useWizardStore } from '@/src/features/medications/wizardStore';

function StrengthDialog({
  visible,
  title,
  label,
  initialValue,
  initialUnit,
  onDismiss,
  onSave,
}: {
  visible: boolean;
  title: string;
  label: string;
  initialValue?: number;
  initialUnit: StrengthUnit;
  onDismiss: () => void;
  onSave: (value?: number, unit?: StrengthUnit) => void;
}) {
  const [amountInput, setAmountInput] = useState(String(initialValue ?? ''));
  const [unit, setUnit] = useState<StrengthUnit>(initialUnit);

  useEffect(() => {
    if (visible) {
      setAmountInput(String(initialValue ?? ''));
      setUnit(initialUnit);
    }
  }, [visible, initialValue, initialUnit]);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label={label}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="numeric"
            accessibilityLabel={label}
          />
          <Text variant="labelLarge" style={styles.unitLabel}>
            Unit
          </Text>
          <RadioButton.Group onValueChange={(v) => setUnit(v as StrengthUnit)} value={unit}>
            {STRENGTH_UNITS.map((u) => (
              <RadioButton.Item key={u} label={u} value={u} />
            ))}
          </RadioButton.Group>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={() => {
              const val = parseFloat(amountInput);
              onSave(isNaN(val) ? undefined : val, unit);
              onDismiss();
            }}
          >
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export default function ConfigureScreen() {
  const { draft, setMedicationType, setStrength, setDoseUnit, canProceedConfigure } = useWizardStore();
  const [typeDialog, setTypeDialog] = useState(false);
  const [strengthDialog, setStrengthDialog] = useState(false);
  const [doseUnitDialog, setDoseUnitDialog] = useState(false);

  const typeLabel = getMedicationTypeLabel(draft.medicationType);
  const isPowder = draft.medicationType === 'powder';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="titleLarge">{draft.name}</Text>

      <Button
        mode="outlined"
        onPress={() => setTypeDialog(true)}
        style={styles.field}
        accessibilityLabel="Select medication type"
      >
        Type: {typeLabel || 'Select type'}
      </Button>

      {isPowder ? (
        <>
          <Button
            mode="outlined"
            onPress={() => setStrengthDialog(true)}
            style={styles.field}
            accessibilityLabel="Set protein per scoop"
          >
            Protein:{' '}
            {draft.strengthValue
              ? `${draft.strengthValue} ${draft.strengthUnit ?? 'g'}`
              : 'Set protein per scoop (optional)'}
          </Button>
          <Button
            mode="outlined"
            onPress={() => setDoseUnitDialog(true)}
            style={styles.field}
            accessibilityLabel="Set scoop size"
          >
            Scoop size:{' '}
            {draft.doseUnitValue
              ? `${draft.doseUnitValue} ${draft.doseUnitUnit ?? 'g'}`
              : 'Set grams per scoop (optional)'}
          </Button>
        </>
      ) : (
        <Button
          mode="outlined"
          onPress={() => setStrengthDialog(true)}
          style={styles.field}
          accessibilityLabel="Set strength"
        >
          Strength:{' '}
          {draft.strengthValue ? `${draft.strengthValue} ${draft.strengthUnit}` : 'Set strength (optional)'}
        </Button>
      )}

      <Button
        mode="contained"
        disabled={!canProceedConfigure()}
        onPress={() => router.push('/medicine/shape')}
        style={styles.next}
      >
        Next
      </Button>

      <MedicationTypeDialog
        visible={typeDialog}
        value={draft.medicationType}
        onDismiss={() => setTypeDialog(false)}
        onConfirm={(type: MedicationType) => {
          setMedicationType(type);
          setTypeDialog(false);
        }}
      />

      <StrengthDialog
        visible={strengthDialog}
        title={isPowder ? 'Protein per scoop' : 'Set strength'}
        label={isPowder ? 'Protein amount' : 'Amount'}
        initialValue={draft.strengthValue}
        initialUnit={draft.strengthUnit ?? (isPowder ? 'g' : 'mg')}
        onDismiss={() => setStrengthDialog(false)}
        onSave={setStrength}
      />

      <StrengthDialog
        visible={doseUnitDialog}
        title="Powder per scoop"
        label="Scoop size"
        initialValue={draft.doseUnitValue}
        initialUnit={draft.doseUnitUnit ?? 'g'}
        onDismiss={() => setDoseUnitDialog(false)}
        onSave={setDoseUnit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  field: { marginTop: 8 },
  next: { marginTop: 24 },
  unitLabel: { marginTop: 16 },
});
