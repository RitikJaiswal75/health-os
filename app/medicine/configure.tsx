import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, type TextInput as RNTextInput } from 'react-native';
import { Button, Dialog, Portal, RadioButton, Text, TextInput } from 'react-native-paper';
import { router, Stack, useNavigation } from 'expo-router';
import { MedicationTypeDialog } from '@/src/core/components/MedicationTypeDialog';
import {
  getMedicationTypeLabel,
  STRENGTH_UNITS,
  type MedicationType,
  type StrengthUnit,
} from '@/src/core/types/domain';
import { useWizardStore } from '@/src/features/medications/wizardStore';
import { validateStrengthFields } from '@/src/features/medications/strengthFieldValidation';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

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
  onSave: (value: number, unit: StrengthUnit) => void;
}) {
  const [amountInput, setAmountInput] = useState(String(initialValue ?? ''));
  const [unit, setUnit] = useState<StrengthUnit>(initialUnit);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);
  const { t } = useT();

  useEffect(() => {
    if (visible) {
      setAmountInput(String(initialValue ?? ''));
      setUnit(initialUnit);
      setAmountError(null);
      setUnitError(null);
    }
  }, [visible, initialValue, initialUnit]);

  const handleSave = () => {
    const result = validateStrengthFields(amountInput, unit, label);
    setAmountError(result.amountError);
    setUnitError(result.unitError);
    if (result.amountError || result.unitError || result.value == null || !unit) {
      return;
    }
    onSave(result.value, unit);
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label={label}
            value={amountInput}
            onChangeText={(value) => {
              setAmountInput(value);
              if (amountError) setAmountError(null);
            }}
            keyboardType="numeric"
            accessibilityLabel={label}
            error={amountError != null}
          />
          {amountError ? (
            <Text variant="bodySmall" style={styles.errorText} accessibilityRole="alert">
              {amountError}
            </Text>
          ) : null}
          <Text variant="labelLarge" style={styles.unitLabel}>
            {t('common.unit')}
          </Text>
          <RadioButton.Group
            onValueChange={(value) => {
              setUnit(value as StrengthUnit);
              if (unitError) setUnitError(null);
            }}
            value={unit}
          >
            {STRENGTH_UNITS.map((u) => (
              <RadioButton.Item key={u} label={u} value={u} />
            ))}
          </RadioButton.Group>
          {unitError ? (
            <Text variant="bodySmall" style={styles.errorText} accessibilityRole="alert">
              {unitError}
            </Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('common.cancel')}</Button>
          <Button onPress={handleSave}>{t('common.save')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export default function ConfigureScreen() {
  const navigation = useNavigation();
  const {
    draft,
    setName,
    setMedicationType,
    setStrength,
    setDoseUnit,
    canProceedConfigure,
    editingMedicationId,
    reset,
  } = useWizardStore();
  const [typeDialog, setTypeDialog] = useState(false);
  const [strengthDialog, setStrengthDialog] = useState(false);
  const [doseUnitDialog, setDoseUnitDialog] = useState(false);
  const nameInputRef = useRef<RNTextInput>(null);
  const { t } = useT();

  const releaseNameInputFocus = useCallback(() => {
    nameInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (editingMedicationId) return;
      if (event.data.action.type !== 'GO_BACK' && event.data.action.type !== 'POP') return;
      reset();
    });
    return unsubscribe;
  }, [navigation, editingMedicationId, reset]);

  const typeLabel = getMedicationTypeLabel(draft.medicationType);
  const isPowder = draft.medicationType === 'powder';
  const isEditing = !!editingMedicationId;
  const canProceed = canProceedConfigure() && draft.name.trim().length > 0;

  const handleNext = () => {
    releaseNameInputFocus();
    if (isEditing && editingMedicationId) {
      router.push(`/medicine/${editingMedicationId}`);
      return;
    }
    router.push('/medicine/shape');
  };

  const openTypeDialog = () => {
    releaseNameInputFocus();
    setTypeDialog(true);
  };

  const openStrengthDialog = () => {
    releaseNameInputFocus();
    setStrengthDialog(true);
  };

  const openDoseUnitDialog = () => {
    releaseNameInputFocus();
    setDoseUnitDialog(true);
  };

  return (
    <>
      <Stack.Screen options={{ title: isEditing ? t('configure.editTitle') : t('configure.title') }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      <TextInput
        ref={nameInputRef}
        label={t('configure.name')}
        value={draft.name}
        onChangeText={setName}
        mode="outlined"
        style={styles.nameInput}
        accessibilityLabel={t('configure.name')}
      />

      <Button
        mode="outlined"
        onPress={openTypeDialog}
        style={styles.field}
        accessibilityLabel={t('configure.selectType')}
      >
        {typeLabel ? t('configure.typeValue', { type: typeLabel }) : t('configure.selectTypeValue')}
      </Button>

      {isPowder ? (
        <>
          <Button
            mode="outlined"
            onPress={openDoseUnitDialog}
            style={styles.field}
            accessibilityLabel={t('configure.setScoop')}
          >
            {draft.doseUnitValue
              ? t('configure.scoopSize', { value: `${draft.doseUnitValue} ${draft.doseUnitUnit ?? 'g'}` })
              : t('configure.scoopOptional')}
          </Button>
          <Button
            mode="outlined"
            onPress={openStrengthDialog}
            style={styles.field}
            accessibilityLabel={t('configure.setStrength')}
          >
            {draft.strengthValue
              ? t('configure.strengthValue', { value: `${draft.strengthValue} ${draft.strengthUnit ?? 'g'}` })
              : t('configure.strengthPerScoopOptional')}
          </Button>
        </>
      ) : (
        <Button
          mode="outlined"
          onPress={openStrengthDialog}
          style={styles.field}
          accessibilityLabel={t('configure.setStrength')}
        >
          {draft.strengthValue
            ? t('configure.strengthValue', { value: `${draft.strengthValue} ${draft.strengthUnit}` })
            : t('configure.strengthOptional')}
        </Button>
      )}

      <Button
        mode="contained"
        disabled={!canProceed}
        onPress={handleNext}
        style={styles.next}
        accessibilityLabel={isEditing ? t('configure.doneA11y') : t('configure.next')}
      >
        {isEditing ? t('configure.done') : t('configure.next')}
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
        title={isPowder ? t('configure.strengthPerScoop') : t('configure.setStrength')}
        label={isPowder ? t('configure.activeIngredient') : t('configure.amount')}
        initialValue={draft.strengthValue}
        initialUnit={draft.strengthUnit ?? (isPowder ? 'g' : 'mg')}
        onDismiss={() => setStrengthDialog(false)}
        onSave={setStrength}
      />

      <StrengthDialog
        visible={doseUnitDialog}
        title={t('configure.scoopServing')}
        label={t('configure.powderPerScoop')}
        initialValue={draft.doseUnitValue}
        initialUnit={draft.doseUnitUnit ?? 'g'}
        onDismiss={() => setDoseUnitDialog(false)}
        onSave={setDoseUnit}
      />
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  nameInput: {
    backgroundColor: healthOsTheme.colors.surface,
  },
  field: { marginTop: 8 },
  next: { marginTop: 24 },
  unitLabel: { marginTop: 16 },
  errorText: {
    color: healthOsTheme.colors.error,
    marginTop: 4,
    marginBottom: 4,
  },
});
