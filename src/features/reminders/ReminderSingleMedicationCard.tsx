import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PillShapeIcon, SHAPE_PREVIEW_COLOR } from '@/src/core/components/PillShapeIcon';
import { formatTakeDoseInstruction, supportsDualColor, type PillShape } from '@/src/core/types/domain';
import type { Medication } from '@/src/db/schema';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

type ReminderSingleMedicationCardProps = {
  medication: Medication;
  doseAmount: number;
};

export function ReminderSingleMedicationCard({
  medication,
  doseAmount,
}: ReminderSingleMedicationCardProps) {
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
    <View style={styles.card} accessibilityLabel={`Reminder for ${displayName}`}>
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
            size={96}
          />
        )}
      </View>

      <Text variant="headlineMedium" style={styles.medName}>
        {displayName}
      </Text>

      {medication.strengthValue != null && (
        <Text variant="titleMedium" style={styles.strength}>
          {medication.strengthValue} {medication.strengthUnit ?? ''}
        </Text>
      )}

      <Text variant="titleLarge" style={styles.takeInstruction}>
        {takeInstruction}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  previewCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  previewPhoto: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  medName: {
    color: healthOsTheme.colors.onSurface,
    textAlign: 'center',
  },
  strength: {
    color: healthOsTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  takeInstruction: {
    color: healthOsTheme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
