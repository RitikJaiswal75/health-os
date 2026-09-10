import { Image, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { PillShapeIcon, SHAPE_PREVIEW_COLOR } from '@/src/core/components/PillShapeIcon';
import { formatTakeDoseInstruction, supportsDualColor, type PillShape } from '@/src/core/types/domain';
import type { Medication } from '@/src/db/schema';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

type ReminderMedicationRowProps = {
  medication: Medication;
  doseAmount: number;
  onTaken: () => void;
  showTakenButton?: boolean;
};

export function ReminderMedicationRow({
  medication,
  doseAmount,
  onTaken,
  showTakenButton = true,
}: ReminderMedicationRowProps) {
  const takeInstruction = formatTakeDoseInstruction(
    doseAmount,
    medication.medicationType,
    medication.strengthValue ?? undefined,
    medication.strengthUnit ?? undefined,
    medication.doseUnitValue ?? undefined,
    medication.doseUnitUnit ?? undefined,
  );
  const previewColor = medication.pillColor ?? SHAPE_PREVIEW_COLOR;
  const previewShape = (medication.pillShape as PillShape | null) ?? 'capsule_divided';
  const showDualTone = supportsDualColor(previewShape) && medication.pillColor2 != null;
  const displayName = medication.nickname ?? medication.name;

  return (
    <View style={styles.row} accessibilityLabel={`Reminder for ${displayName}`}>
      <View style={styles.previewCircle}>
        {medication.photoUri ? (
          <Image
            source={{ uri: medication.photoUri }}
            style={styles.previewPhoto}
            accessibilityIgnoresInvertColors
            accessibilityLabel={`Photo of ${displayName}`}
          />
        ) : (
          <PillShapeIcon
            shape={previewShape}
            color={previewColor}
            color2={showDualTone ? medication.pillColor2 ?? undefined : undefined}
            size={56}
          />
        )}
      </View>
      <View style={styles.details}>
        <Text variant="titleMedium" style={styles.medName}>
          {displayName}
        </Text>
        {medication.strengthValue != null && (
          <Text variant="bodyMedium" style={styles.strength}>
            {medication.strengthValue} {medication.strengthUnit ?? ''}
          </Text>
        )}
        <Text variant="bodyLarge" style={styles.takeInstruction}>
          {takeInstruction}
        </Text>
      </View>
      {showTakenButton ? (
        <Button mode="contained-tonal" onPress={onTaken} accessibilityLabel={`Mark ${displayName} taken`}>
          Taken
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: healthOsTheme.colors.outlineVariant,
  },
  previewCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  medName: {
    color: healthOsTheme.colors.onSurface,
  },
  strength: {
    color: healthOsTheme.colors.onSurfaceVariant,
  },
  takeInstruction: {
    color: healthOsTheme.colors.primary,
    fontWeight: '600',
  },
});
