import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { MedicationRepository, DoseEventRepository } from '@/src/features/medications/medicationRepository';
import { markDoseAsTaken } from '@/src/features/inventory/doseTakenService';
import { scheduleSnoozeAt, dismissReminderNotification } from '@/src/features/reminders/reminderService';
import { exitReminderScreen } from '@/src/features/reminders/reminderDeepLink';
import { SnoozeTimeDialog } from '@/src/core/components/SnoozeTimeDialog';
import { formatLocalDateTime } from '@/src/core/dates/dateUtils';
import { parseSnoozedFromNotes } from '@/src/features/medications/doseSlotUtils';
import {
  cleanupSnoozeConflicts,
  deletePendingAtSlot,
} from '@/src/features/medications/snoozeCleanupService';
import { useVariantTakenFlow } from '@/src/features/variants/VariantPickerSheet';
import { PillShapeIcon, SHAPE_PREVIEW_COLOR } from '@/src/core/components/PillShapeIcon';
import { formatTakeDoseInstruction, supportsDualColor, type PillShape } from '@/src/core/types/domain';
import type { Medication } from '@/src/db/schema';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export default function ReminderScreen() {
  const { medicationId, alarmId, doseEventId, scheduledAt } = useLocalSearchParams<{
    medicationId: string;
    alarmId: string;
    doseEventId?: string;
    scheduledAt?: string;
  }>();
  const dbState = useDatabaseBootstrap();
  const [snoozeDialog, setSnoozeDialog] = useState(false);

  const medRepo = dbState.status === 'ready' ? new MedicationRepository(dbState.db) : null;
  const med = medicationId && medRepo ? medRepo.getById(medicationId) : null;
  const variants = medicationId && medRepo ? medRepo.getVariants(medicationId) : [];
  const totalStock = variants.reduce((sum, v) => sum + v.currentQuantity, 0);

  const resolveDose = (): ReturnType<DoseEventRepository['getById']> => {
    if (dbState.status !== 'ready' || !medicationId) return null;
    const doseRepo = new DoseEventRepository(dbState.db);
    if (doseEventId) return doseRepo.getById(doseEventId);
    return doseRepo.findPendingForMedication(medicationId, scheduledAt ?? new Date().toISOString());
  };

  const dismiss = async () => {
    const handled = {
      medicationId: medicationId ?? '',
      alarmId: alarmId ?? '',
      scheduledAt,
      doseEventId,
    };
    if (alarmId) {
      await dismissReminderNotification(alarmId, medicationId);
    }
    await exitReminderScreen(handled);
  };

  const completeTaken = (variantId?: string) => {
    if (dbState.status !== 'ready' || !medicationId || !medRepo) return;
    const doseRepo = new DoseEventRepository(dbState.db);
    let dose = resolveDose();
    if (!dose) {
      dose = doseRepo.createPending({
        medicationId,
        scheduledAt: scheduledAt ?? new Date().toISOString(),
      });
    }
    markDoseAsTaken(dbState.db, dose.id, variantId);
    void dismiss();
  };

  const { requestTaken, sheet: variantSheet } = useVariantTakenFlow(
    (id) => medRepo?.getVariants(id) ?? [],
    (variantId) => completeTaken(variantId || undefined),
  );

  const handleSkip = () => {
    if (dbState.status !== 'ready' || !medicationId) return;
    const doseRepo = new DoseEventRepository(dbState.db);
    const dose = resolveDose();
    if (dose) doseRepo.updateStatus(dose.id, 'skipped');
    void dismiss();
  };

  const handleSnooze = async (snoozeUntil: Date) => {
    if (!med || dbState.status !== 'ready') return;
    const doseRepo = new DoseEventRepository(dbState.db);
    const dose = resolveDose();
    const snoozedUntil = formatLocalDateTime(snoozeUntil);

    if (dose) {
      const originalSlot = parseSnoozedFromNotes(dose.notes) ?? dose.scheduledAt;
      doseRepo.snooze(dose.id, snoozedUntil, originalSlot);
      deletePendingAtSlot(doseRepo, dose.scheduleId, originalSlot);
      cleanupSnoozeConflicts(dbState.db);
      await scheduleSnoozeAt(
        med.id,
        med.nickname ?? med.name,
        snoozedUntil,
        dose.id,
        dbState.db,
      );
    } else {
      await scheduleSnoozeAt(med.id, med.nickname ?? med.name, snoozedUntil, undefined, dbState.db);
    }

    setSnoozeDialog(false);
    void dismiss();
  };

  if (!med) {
    return (
      <View style={styles.container}>
        <Text>Loading reminder…</Text>
      </View>
    );
  }

  const activeDose = dbState.status === 'ready' ? resolveDose() : null;
  const doseAmount = activeDose?.doseAmount ?? 1;
  const takeInstruction = formatTakeDoseInstruction(
    doseAmount,
    med.medicationType,
    med.strengthValue ?? undefined,
    med.strengthUnit ?? undefined,
    med.doseUnitValue ?? undefined,
    med.doseUnitUnit ?? undefined,
  );
  const previewColor = med.pillColor ?? SHAPE_PREVIEW_COLOR;
  const previewShape = (med.pillShape as PillShape | null) ?? 'capsule_divided';
  const showDualTone = supportsDualColor(previewShape) && med.pillColor2 != null;

  return (
    <View style={styles.container} accessibilityLabel="Medication reminder">
      <View style={styles.previewCircle}>
        {med.photoUri ? (
          <Image
            source={{ uri: med.photoUri }}
            style={styles.previewPhoto}
            accessibilityIgnoresInvertColors
            accessibilityLabel={`Photo of ${med.nickname ?? med.name}`}
          />
        ) : (
          <PillShapeIcon
            shape={previewShape}
            color={previewColor}
            color2={showDualTone ? med.pillColor2 ?? undefined : undefined}
            size={96}
          />
        )}
      </View>
      <Text variant="headlineMedium" style={styles.medName}>
        {med.nickname ?? med.name}
      </Text>
      <Text variant="titleLarge" style={styles.takeInstruction}>
        {takeInstruction}
      </Text>
      <Text variant="bodyLarge" style={styles.meta}>
        {totalStock} remaining
      </Text>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => requestTaken(medicationId!)}
          accessibilityLabel="Mark taken"
        >
          Taken
        </Button>
        <Button mode="outlined" onPress={() => setSnoozeDialog(true)} accessibilityLabel="Snooze">
          Snooze
        </Button>
        <Button mode="text" onPress={handleSkip} accessibilityLabel="Skip dose">
          Skip
        </Button>
      </View>

      {variantSheet}

      <SnoozeTimeDialog
        visible={snoozeDialog}
        onDismiss={() => setSnoozeDialog(false)}
        onConfirm={(snoozeUntil) => void handleSnooze(snoozeUntil)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: healthOsTheme.colors.background,
  },
  previewCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  previewPhoto: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  medName: {
    color: healthOsTheme.colors.onSurface,
    textAlign: 'center',
  },
  takeInstruction: {
    color: healthOsTheme.colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  meta: {
    color: healthOsTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  actions: { gap: 12, width: '100%', marginTop: 8 },
});
