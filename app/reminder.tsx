import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { MedicationRepository, DoseEventRepository } from '@/src/features/medications/medicationRepository';
import { markDoseAsTaken } from '@/src/features/inventory/doseTakenService';
import { dismissReminderNotification, rescheduleReminders } from '@/src/features/reminders/reminderService';
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
import type { DoseEvent, Medication } from '@/src/db/types';
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
  const [refreshKey, setRefreshKey] = useState(0);
  const db = dbState.status === 'ready' ? dbState.db : null;
  const medRepo = useMemo(() => (db ? new MedicationRepository(db) : null), [db]);
  const { t } = useT();
  const insets = useSafeAreaInsets();
  // Full-screen modal with no header: keep content clear of the status and gesture bars.
  const containerStyle = [
    styles.container,
    { paddingTop: CONTAINER_PADDING + insets.top, paddingBottom: CONTAINER_PADDING + insets.bottom },
  ];

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
  }, [db, medRepo, medicationId, doseEventId, scheduledAt, refreshKey]);

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

  const completeTaken = (item: ReminderItem) => {
    if (dbState.status !== 'ready' || !medRepo) return;
    const doseRepo = new DoseEventRepository(dbState.db);
    // Save failed (already reported): keep the alarm open so the dose isn't silently lost.
    if (!markDoseAsTaken(dbState.db, item.dose.id)) return;

    if (scheduledAt) {
      const remaining = doseRepo.findPendingDosesAtMinute(scheduledAt);
      if (remaining.length === 0) {
        void dismiss();
      } else {
        // Keep the screen open with only the doses still pending at this slot.
        setRefreshKey((key) => key + 1);
      }
      return;
    }

    void dismiss();
  };

  const handleTakeAll = () => {
    if (dbState.status !== 'ready') return;
    const failed = items.filter((item) => !markDoseAsTaken(dbState.db, item.dose.id));
    if (failed.length > 0) {
      // Keep the alarm open with the doses that are still pending.
      setRefreshKey((key) => key + 1);
      return;
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
    await rescheduleReminders(dbState.db);
    setSnoozeDialog(false);
    void dismiss();
  };

  if (items.length === 0) {
    if (dbState.status === 'loading') {
      return (
        <View style={containerStyle} accessibilityLabel={t('reminder.loadingA11y')}>
          <Text variant="headlineSmall" style={styles.heading}>
            {t('reminder.loading')}
          </Text>
        </View>
      );
    }

    if (dbState.status === 'error') {
      return (
        <View style={containerStyle} accessibilityLabel={t('reminder.unavailableA11y')}>
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
      <View style={containerStyle} accessibilityLabel={t('reminder.screenA11y')}>
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
    <View style={containerStyle} accessibilityLabel={t('reminder.screenA11y')}>
      <Text variant="headlineSmall" style={styles.heading}>
        {isGrouped ? t('reminder.dueMany') : t('reminder.dueTitle')}
      </Text>

      {/* Scrolls in both modes so large font sizes never clip the medication details. */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={isGrouped ? styles.listContent : styles.singleContent}
      >
        {isGrouped ? (
          items.map((item) => (
            <ReminderMedicationRow
              key={item.dose.id}
              medication={item.medication}
              doseAmount={item.dose.doseAmount}
              onTaken={() => completeTaken(item)}
            />
          ))
        ) : (
          <ReminderSingleMedicationCard
            medication={items[0]!.medication}
            doseAmount={items[0]!.dose.doseAmount}
          />
        )}
      </ScrollView>

      <View style={styles.actions}>
        {isGrouped ? (
          <Button
            mode="contained"
            onPress={handleTakeAll}
            contentStyle={styles.primaryButtonContent}
            accessibilityLabel={t('reminder.takeAll')}
          >
            {t('reminder.takeAllLabel')}
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={() => completeTaken(items[0]!)}
            contentStyle={styles.primaryButtonContent}
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


      <SnoozeTimeDialog
        visible={snoozeDialog}
        onDismiss={() => setSnoozeDialog(false)}
        onConfirm={(snoozeUntil) => void handleSnoozeAll(snoozeUntil)}
      />
    </View>
  );
}

const CONTAINER_PADDING = 24;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: CONTAINER_PADDING,
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
  singleContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  primaryButtonContent: { minHeight: 56 },
  actions: { gap: 12, width: '100%' },
});
