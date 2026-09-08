import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Dialog, FAB, Portal, RadioButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { navigateToAddMedication } from '@/src/features/reliability/reliabilityService';
import { formatDateKey, formatLocalDateTime, formatScheduledTime, getDateStrip } from '@/src/core/dates/dateUtils';
import { DateStrip, type DateCompletion } from '@/src/core/components/DateStrip';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { DoseEventRepository, MedicationRepository } from '@/src/features/medications/medicationRepository';
import { parseSnoozedFromNotes, originalScheduledAt } from '@/src/features/medications/doseSlotUtils';
import { generateUpcomingDoseEvents, removePendingDuplicatingResolvedDoses, removeDuplicateDoseEvents } from '@/src/features/medications/doseGenerationService';
import {
  cleanupSnoozeConflicts,
  deletePendingAtSlot,
} from '@/src/features/medications/snoozeCleanupService';
import { InventoryService } from '@/src/features/inventory/inventoryService';
import { markDoseAsTaken } from '@/src/features/inventory/doseTakenService';
import type { DoseEvent } from '@/src/db/schema';
import type { DoseStatus } from '@/src/core/types/domain';
import { ReminderReconciler, scheduleAlarms, scheduleSnoozeAt } from '@/src/features/reminders/reminderService';
import { SnoozeTimeDialog } from '@/src/core/components/SnoozeTimeDialog';
import { useVariantTakenFlow } from '@/src/features/variants/VariantPickerSheet';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export default function HomeScreen() {
  const dbState = useDatabaseBootstrap();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editDose, setEditDose] = useState<DoseEvent | null>(null);
  const [editStatus, setEditStatus] = useState<DoseStatus>('taken');
  const [snoozeDose, setSnoozeDose] = useState<DoseEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const dateKey = formatDateKey(selectedDate);

  useFocusEffect(
    useCallback(() => {
      if (dbState.status !== 'ready') return;
      cleanupSnoozeConflicts(dbState.db);
      generateUpcomingDoseEvents(dbState.db, 14);
      const reconciler = new ReminderReconciler(dbState.db);
      void scheduleAlarms(reconciler.reconcile(7));
      setRefreshKey((key) => key + 1);
    }, [dbState]),
  );

  const medRepo = useMemo(
    () => (dbState.status === 'ready' ? new MedicationRepository(dbState.db) : null),
    [dbState],
  );

  const { doses, meds, completionByDate } = useMemo(() => {
    if (dbState.status !== 'ready' || !medRepo) {
      return { doses: [], meds: [], completionByDate: {} as Record<string, DateCompletion> };
    }
    const doseRepo = new DoseEventRepository(dbState.db);
    removePendingDuplicatingResolvedDoses(dbState.db);
    removeDuplicateDoseEvents(dbState.db);
    const allMeds = medRepo.getAll();
    const activeMedIds = new Set(allMeds.map((med) => med.id));
    const stripDates = getDateStrip(7, selectedDate);
    const completion: Record<string, DateCompletion> = {};

    for (const date of stripDates) {
      const key = formatDateKey(date);
      const dayDoses = doseRepo.getForDate(key, activeMedIds);
      completion[key] = {
        scheduled: dayDoses.filter((d) => d.status !== 'skipped').length,
        taken: dayDoses.filter((d) => d.status === 'taken').length,
      };
    }

    const allDoses = doseRepo.getForDate(dateKey, activeMedIds);
    return { doses: allDoses, meds: allMeds, completionByDate: completion };
  }, [dbState, dateKey, medRepo, selectedDate, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const { requestTaken, sheet: variantSheet } = useVariantTakenFlow<DoseEvent>(
    (id) => medRepo?.getVariants(id) ?? [],
    (variantId, dose) => {
      if (!dose || dbState.status !== 'ready') return;
      markDoseAsTaken(dbState.db, dose.id, variantId || undefined);
      refresh();
    },
  );

  const handleTaken = (dose: DoseEvent) => {
    if (dbState.status !== 'ready' || !medRepo) return;

    const variants = medRepo.getVariants(dose.medicationId);
    if (variants.length > 1) {
      requestTaken(dose.medicationId, dose);
      return;
    }

    markDoseAsTaken(dbState.db, dose.id, variants[0]?.id);
    refresh();
  };

  const handleSkip = (dose: DoseEvent) => {
    if (dbState.status !== 'ready') return;
    new DoseEventRepository(dbState.db).updateStatus(dose.id, 'skipped');
    removePendingDuplicatingResolvedDoses(dbState.db);
    removeDuplicateDoseEvents(dbState.db);
    refresh();
  };

  const confirmSnooze = async (snoozeUntil: Date) => {
    if (dbState.status !== 'ready' || !medRepo || !snoozeDose) return;
    const med = medRepo.getById(snoozeDose.medicationId);
    if (!med) return;

    const doseRepo = new DoseEventRepository(dbState.db);
    const snoozedUntil = formatLocalDateTime(snoozeUntil);
    const originalSlot = originalScheduledAt(snoozeDose);
    doseRepo.snooze(snoozeDose.id, snoozedUntil, originalSlot);
    deletePendingAtSlot(doseRepo, snoozeDose.scheduleId, originalSlot);
    cleanupSnoozeConflicts(dbState.db);

    await scheduleSnoozeAt(med.id, med.nickname ?? med.name, snoozedUntil, snoozeDose.id);

    const reconciler = new ReminderReconciler(dbState.db);
    await scheduleAlarms(reconciler.reconcile(7));
    setSnoozeDose(null);
    refresh();
  };

  const handleSaveEdit = () => {
    if (!editDose || dbState.status !== 'ready' || !medRepo) return;
    if (editStatus === 'taken' && editDose.status !== 'taken') {
      markDoseAsTaken(dbState.db, editDose.id);
    } else {
      const doseRepo = new DoseEventRepository(dbState.db);
      const inventory = new InventoryService(dbState.db, medRepo, doseRepo);
      inventory.applyStatusChange(editDose.id, editDose.status as DoseStatus, editStatus);
      doseRepo.updateStatus(editDose.id, editStatus, {
        takenAt: editStatus === 'taken' ? new Date().toISOString() : undefined,
      });
    }
    setEditDose(null);
    refresh();
  };

  const handleDeleteDose = () => {
    if (!editDose || dbState.status !== 'ready' || !medRepo) return;
    const doseRepo = new DoseEventRepository(dbState.db);
    const inventory = new InventoryService(dbState.db, medRepo, doseRepo);
    inventory.compensateOnDelete(editDose.id, editDose.status as DoseStatus);
    doseRepo.delete(editDose.id);
    setEditDose(null);
    refresh();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Health OS" />
        <Appbar.Action icon="calendar" onPress={() => router.push('/history')} accessibilityLabel="Open history" />
        <Appbar.Action icon="dots-vertical" onPress={() => router.push('/about')} accessibilityLabel="Open settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <DateStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          completionByDate={completionByDate}
        />

        <Card style={styles.panel}>
          <Card.Content>
            {doses.length === 0 ? (
              <Text style={styles.panelEmpty}>No scheduled medications for this day.</Text>
            ) : (
              doses.map((dose) => {
                const med = meds.find((m) => m.id === dose.medicationId);
                const isLogged = ['taken', 'skipped', 'missed'].includes(dose.status);
                const isActionable = dose.status === 'pending' || dose.status === 'snoozed';
                return (
                  <Card
                    key={dose.id}
                    style={styles.doseCard}
                    onPress={
                      isLogged
                        ? () => {
                            setEditDose(dose);
                            setEditStatus(dose.status as DoseStatus);
                          }
                        : undefined
                    }
                  >
                    <Card.Content>
                      <Text variant="titleMedium">{med?.nickname ?? med?.name ?? 'Medication'}</Text>
                      <Text variant="bodySmall">
                        {dose.status === 'snoozed'
                          ? `${formatScheduledTime(originalScheduledAt(dose))} — snoozed until ${formatScheduledTime(dose.scheduledAt)}`
                          : `${formatScheduledTime(dose.scheduledAt)} — ${dose.status}`}
                        {med && med.currentQuantity > 0
                          ? ` · ${med.currentQuantity} remaining`
                          : ''}
                      </Text>
                      {!isActionable ? null : (
                        <View style={styles.actions}>
                          <Button mode="contained" onPress={() => handleTaken(dose)} accessibilityLabel="Mark taken">
                            Taken
                          </Button>
                          <Button mode="outlined" onPress={() => handleSkip(dose)} accessibilityLabel="Skip dose">
                            Skip
                          </Button>
                          <Button mode="text" onPress={() => setSnoozeDose(dose)} accessibilityLabel="Snooze">
                            Snooze
                          </Button>
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </Card.Content>
        </Card>

        <Card
          style={styles.panel}
          onPress={() => router.push('/(tabs)/library')}
          accessibilityRole="button"
          accessibilityLabel="Open your medications"
        >
          <Card.Content>
            <View style={styles.panelHeader}>
              <Text variant="titleMedium">Your medications</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={healthOsTheme.colors.onSurfaceVariant}
              />
            </View>
            {meds.length === 0 ? (
              <Text variant="bodyMedium" style={styles.panelHint}>
                Add medications to get reminders when it&apos;s time to take them and learn about possible
                interactions between your medications.
              </Text>
            ) : (
              <Text variant="bodyMedium" style={styles.panelHint}>
                {meds.length} medication{meds.length === 1 ? '' : 's'} in your library. Tap to view and manage.
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB icon="plus" style={styles.fab} onPress={() => void navigateToAddMedication()} accessibilityLabel="Add medication" />

      {variantSheet}

      <SnoozeTimeDialog
        visible={!!snoozeDose}
        onDismiss={() => setSnoozeDose(null)}
        onConfirm={(snoozeUntil) => void confirmSnooze(snoozeUntil)}
      />

      <Portal>
        <Dialog visible={!!editDose} onDismiss={() => setEditDose(null)}>
          <Dialog.Title>Edit dose</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={(v) => setEditStatus(v as DoseStatus)} value={editStatus}>
              <RadioButton.Item label="Taken" value="taken" />
              <RadioButton.Item label="Skipped" value="skipped" />
              <RadioButton.Item label="Missed" value="missed" />
              <RadioButton.Item label="Pending" value="pending" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDose(null)}>Cancel</Button>
            <Button onPress={handleDeleteDose} textColor="#CF6679">
              Delete
            </Button>
            <Button mode="contained" onPress={handleSaveEdit}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: healthOsTheme.colors.background },
  content: { paddingBottom: 96, gap: 12 },
  panel: {
    marginHorizontal: 16,
    backgroundColor: healthOsTheme.colors.surface,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  panelEmpty: {
    color: healthOsTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 24,
  },
  panelHint: {
    color: healthOsTheme.colors.onSurfaceVariant,
  },
  doseCard: {
    marginBottom: 8,
    backgroundColor: healthOsTheme.colors.surfaceVariant,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
