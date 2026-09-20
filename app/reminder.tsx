import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { MedicationRepository, DoseEventRepository } from '@/src/features/medications/medicationRepository';
import { markDoseAsTaken } from '@/src/features/inventory/doseTakenService';
import { scheduleSnoozeAt, dismissReminderNotification } from '@/src/features/reminders/reminderService';
import { exitReminderScreen } from '@/src/features/reminders/reminderDeepLink';
import { ReminderMedicationRow } from '@/src/features/reminders/ReminderMedicationRow';
import { ReminderSingleMedicationCard } from '@/src/features/reminders/ReminderSingleMedicationCard';
import { SnoozeTimeDialog } from '@/src/core/components/SnoozeTimeDialog';
import { formatLocalDateTime } from '@/src/core/dates/dateUtils';
import { parseSnoozedFromNotes } from '@/src/features/medications/doseSlotUtils';
import {
  cleanupSnoozeConflicts,
  deletePendingAtSlot,
} from '@/src/features/medications/snoozeCleanupService';
import { useVariantTakenFlow } from '@/src/features/variants/VariantPickerSheet';
import type { DoseEvent, Medication } from '@/src/db/schema';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

type ReminderItem = {
  medication: Medication;
  dose: DoseEvent;
};

export default function ReminderScreen() {
  const { medicationId, alarmId, doseEventId, scheduledAt } = useLocalSearchParams<{
    medicationId?: string;
    alarmId: string;
    doseEventId?: string;
    scheduledAt?: string;
  }>();
  const dbState = useDatabaseBootstrap();
  const [snoozeDialog, setSnoozeDialog] = useState(false);
  const db = dbState.status === 'ready' ? dbState.db : null;
  const medRepo = useMemo(() => (db ? new MedicationRepository(db) : null), [db]);
  const { t } = useT();

  const items = useMemo((): ReminderItem[] => {
    if (!db || !medRepo) return [];

    const doseRepo = new DoseEventRepository(db);
    const slotAt = scheduledAt ?? new Date().toISOString();

    if (scheduledAt) {
      const doses = doseRepo.findPendingDosesAtMinute(scheduledAt);
      const loaded: ReminderItem[] = [];
      for (const dose of doses) {
        const medication = medRepo.getById(dose.medicationId);
        if (medication) loaded.push({ medication, dose });
      }
      if (loaded.length > 0) return loaded;
    }

    if (medicationId) {
      const medication = medRepo.getById(medicationId);
      if (!medication) return [];
      let dose = doseEventId ? doseRepo.getById(doseEventId) : null;
      if (!dose) {
        dose = doseRepo.findPendingForMedication(medicationId, slotAt);
      }
      if (dose) return [{ medication, dose }];
    }

    return [];
  }, [db, medRepo, medicationId, doseEventId, scheduledAt]);

  const dismiss = async () => {
    const handled = {
      ...(medicationId ? { medicationId } : {}),
      alarmId: alarmId ?? '',
      scheduledAt,
      doseEventId,
    };
    if (alarmId) {
      await dismissReminderNotification(alarmId);
    }
    await exitReminderScreen(handled);
  };

  const completeTaken = (item: ReminderItem, variantId?: string) => {
    if (dbState.status !== 'ready' || !medRepo) return;
    const doseRepo = new DoseEventRepository(dbState.db);
    let dose = item.dose;
    if (!dose) {
      dose = doseRepo.createPending({
        medicationId: item.medication.id,
        scheduledAt: scheduledAt ?? new Date().toISOString(),
      });
    }
    markDoseAsTaken(dbState.db, dose.id, variantId);

    if (scheduledAt) {
      const remaining = doseRepo.findPendingDosesAtMinute(scheduledAt);
      if (remaining.length === 0) void dismiss();
      return;
    }

    void dismiss();
  };

  const { requestTaken, sheet: variantSheet } = useVariantTakenFlow<ReminderItem>(
    (id) => medRepo?.getVariants(id) ?? [],
    (variantId, context) => {
      if (context) completeTaken(context, variantId || undefined);
    },
  );

  const handleTakeAll = () => {
    const multiVariant = items.find(
      (item) => (medRepo?.getVariants(item.medication.id) ?? []).length > 1,
    );
    if (multiVariant) {
      requestTaken(multiVariant.medication.id, multiVariant);
      return;
    }

    if (dbState.status !== 'ready') return;
    for (const item of items) {
      const variants = medRepo?.getVariants(item.medication.id) ?? [];
      markDoseAsTaken(dbState.db, item.dose.id, variants[0]?.id);
    }
    void dismiss();
  };

  const handleSkipAll = () => {
    if (dbState.status !== 'ready') return;
    const doseRepo = new DoseEventRepository(dbState.db);
    for (const item of items) {
      doseRepo.updateStatus(item.dose.id, 'skipped');
    }
    void dismiss();
  };

  const handleSnoozeAll = async (snoozeUntil: Date) => {
    if (dbState.status !== 'ready' || !medRepo) return;
    const doseRepo = new DoseEventRepository(dbState.db);
    const snoozedUntil = formatLocalDateTime(snoozeUntil);

    for (const item of items) {
      const dose = item.dose;
      const originalSlot = parseSnoozedFromNotes(dose.notes) ?? dose.scheduledAt;
      doseRepo.snooze(dose.id, snoozedUntil, originalSlot);
      deletePendingAtSlot(doseRepo, dose.scheduleId, originalSlot);
    }

    cleanupSnoozeConflicts(dbState.db);
    if (items[0]) {
      await scheduleSnoozeAt(
        items[0].medication.id,
        items[0].medication.nickname ?? items[0].medication.name,
        snoozedUntil,
        items[0].dose.id,
        dbState.db,
      );
    }
    setSnoozeDialog(false);
    void dismiss();
  };

  if (items.length === 0) {
    if (dbState.status === 'loading') {
      return (
        <View style={styles.container} accessibilityLabel={t('reminder.loadingA11y')}>
          <Text variant="headlineSmall" style={styles.heading}>
            {t('reminder.loading')}
          </Text>
        </View>
      );
    }

    if (dbState.status === 'error') {
      return (
        <View style={styles.container} accessibilityLabel={t('reminder.unavailableA11y')}>
          <Text variant="headlineSmall" style={styles.heading}>
            {t('reminder.unavailable')}
          </Text>
          <Button mode="contained" onPress={dbState.retry} accessibilityLabel={t('reminder.retryA11y')}>
            {t('common.retry')}
          </Button>
        </View>
      );
    }

    return (
      <View style={styles.container} accessibilityLabel={t('reminder.screenA11y')}>
        <Text variant="headlineSmall" style={styles.heading}>
          {t('reminder.gone')}
        </Text>
        <Button
          mode="contained"
          onPress={() => void dismiss()}
          accessibilityLabel={t('reminder.dismissA11y')}
        >
          {t('common.dismiss')}
        </Button>
      </View>
    );
  }

  const isGrouped = items.length > 1;

  return (
    <View style={styles.container} accessibilityLabel={t('reminder.screenA11y')}>
      <Text variant="headlineSmall" style={styles.heading}>
        {isGrouped ? t('reminder.dueMany') : t('reminder.dueTitle')}
      </Text>

      {isGrouped ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {items.map((item) => (
            <ReminderMedicationRow
              key={item.dose.id}
              medication={item.medication}
              doseAmount={item.dose.doseAmount}
              showTakenButton={false}
              onTaken={() => requestTaken(item.medication.id, item)}
            />
          ))}
        </ScrollView>
      ) : (
        <ReminderSingleMedicationCard
          medication={items[0]!.medication}
          doseAmount={items[0]!.dose.doseAmount}
        />
      )}

      <View style={styles.actions}>
        {isGrouped ? (
          <Button mode="contained" onPress={handleTakeAll} accessibilityLabel={t('reminder.takeAll')}>
            {t('reminder.takeAllLabel')}
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={() => requestTaken(items[0]!.medication.id, items[0])}
            accessibilityLabel={t('home.markTaken')}
          >
            {t('common.taken')}
          </Button>
        )}
        <Button mode="outlined" onPress={() => setSnoozeDialog(true)} accessibilityLabel={t('common.snooze')}>
          {t('common.snooze')}
        </Button>
        <Button mode="text" onPress={handleSkipAll} accessibilityLabel={t('home.skipDose')}>
          {t('common.skip')}
        </Button>
        <Button mode="text" onPress={() => void dismiss()} accessibilityLabel={t('reminder.dismissA11y')}>
          {t('common.dismiss')}
        </Button>
      </View>

      {variantSheet}

      <SnoozeTimeDialog
        visible={snoozeDialog}
        onDismiss={() => setSnoozeDialog(false)}
        onConfirm={(snoozeUntil) => void handleSnoozeAll(snoozeUntil)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: healthOsTheme.colors.background,
  },
  heading: {
    color: healthOsTheme.colors.onSurface,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingBottom: 8,
  },
  actions: { gap: 12, width: '100%' },
});
