import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Dialog, FAB, Menu, Portal, RadioButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { navigateToAddMedication } from '@/src/features/reliability/reliabilityService';
import { computeDateCompletion, formatDateKey, formatLocalDateTime, formatScheduledTime, getDateStrip } from '@/src/core/dates/dateUtils';
import { DateStrip, type DateCompletion } from '@/src/core/components/DateStrip';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { DoseEventRepository, MedicationRepository } from '@/src/features/medications/medicationRepository';
import { canLogDoseForTodayOrPast, originalScheduledAt } from '@/src/features/medications/doseSlotUtils';
import { generateUpcomingDoseEvents, removePendingDuplicatingResolvedDoses, removeDuplicateDoseEvents } from '@/src/features/medications/doseGenerationService';
import {
  cleanupSnoozeConflicts,
  deletePendingAtSlot,
} from '@/src/features/medications/snoozeCleanupService';
import { deleteDose, markDoseAsTaken, saveDoseEdit } from '@/src/features/inventory/doseTakenService';
import type { DoseEvent } from '@/src/db/types';
import { DOSE_STATUS_OPTIONS, getDoseStatusLabel, type DoseStatus } from '@/src/core/types/domain';
import {
  rescheduleReminders,
} from '@/src/features/reminders/reminderService';
import { SnoozeTimeDialog } from '@/src/core/components/SnoozeTimeDialog';
import { AppUpdateBanner } from '@/src/core/components/AppUpdateBanner';
import { ReminderPermissionBanner } from '@/src/core/components/ReminderPermissionBanner';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

export default function HomeScreen() {
  const dbState = useDatabaseBootstrap();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editDose, setEditDose] = useState<DoseEvent | null>(null);
  const [editStatus, setEditStatus] = useState<DoseStatus>('taken');
  const [snoozeDose, setSnoozeDose] = useState<DoseEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const { t } = useT();

  const dateKey = formatDateKey(selectedDate);

  useFocusEffect(
    useCallback(() => {
      if (dbState.status !== 'ready') return;
      cleanupSnoozeConflicts(dbState.db);
      // Startup already ran the whole-table cleanup; focus only tops up the horizon.
      generateUpcomingDoseEvents(dbState.db, 14, false);
      void rescheduleReminders(dbState.db);
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
    const allMeds = medRepo.getAll();
    const activeMedIds = new Set(allMeds.map((med) => med.id));
    // The strip is centred on the selected day, so one load covers both. getForDates also hides
    // duplicate rows, so no cleanup writes are needed during render.
    const stripKeys = getDateStrip(7, selectedDate).map(formatDateKey);
    const dosesByDate = new DoseEventRepository(dbState.db).getForDates(stripKeys, activeMedIds);
    const completion: Record<string, DateCompletion> = {};
    for (const key of stripKeys) {
      completion[key] = computeDateCompletion(dosesByDate.get(key) ?? []);
    }

    return { doses: dosesByDate.get(dateKey) ?? [], meds: allMeds, completionByDate: completion };
  }, [dbState, dateKey, medRepo, selectedDate, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const handleTaken = (dose: DoseEvent) => {
    if (dbState.status !== 'ready' || !canLogDoseForTodayOrPast(dose)) return;
    markDoseAsTaken(dbState.db, dose.id);
    refresh();
  };

  const handleSkip = (dose: DoseEvent) => {
    if (dbState.status !== 'ready') return;
    new DoseEventRepository(dbState.db).updateStatus(dose.id, 'skipped');
    removePendingDuplicatingResolvedDoses(dbState.db);
    removeDuplicateDoseEvents(dbState.db);
    void rescheduleReminders(dbState.db);
    refresh();
  };

  const confirmSnooze = async (snoozeUntil: Date) => {
    if (dbState.status !== 'ready' || !medRepo || !snoozeDose) return;
    const med = medRepo.getById(snoozeDose.medicationId);
    if (!med) return;

    const doseRepo = new DoseEventRepository(dbState.db);
    const snoozedUntil = formatLocalDateTime(snoozeUntil);
    const originalSlot = originalScheduledAt(snoozeDose);
    // One transaction: a crash between the steps would leave the slot twice.
    dbState.db.withTransactionSync(() => {
      doseRepo.snooze(snoozeDose.id, snoozedUntil, originalSlot);
      deletePendingAtSlot(doseRepo, snoozeDose.scheduleId, originalSlot);
      cleanupSnoozeConflicts(dbState.db);
    });

    await rescheduleReminders(dbState.db);
    setSnoozeDose(null);
    refresh();
  };

  const handleSaveEdit = () => {
    if (!editDose || dbState.status !== 'ready') return;
    if (!saveDoseEdit(dbState.db, editDose, editStatus)) return;
    setEditDose(null);
    refresh();
  };

  const handleDeleteDose = () => {
    if (!editDose || dbState.status !== 'ready') return;
    if (!deleteDose(dbState.db, editDose)) return;
    setEditDose(null);
    refresh();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title={t('home.title')} />
        <Appbar.Action
          icon="translate"
          onPress={() => router.push('/language')}
          accessibilityLabel={t('menu.language')}
        />
        <Appbar.Action icon="calendar" onPress={() => router.push('/history')} accessibilityLabel={t('menu.openHistory')} />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
              accessibilityLabel={t('menu.open')}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              router.push('/language');
            }}
            title={t('menu.language')}
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              router.push('/about');
            }}
            title={t('menu.about')}
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              router.push('/reliability');
            }}
            title={t('menu.troubleshooting')}
          />
        </Menu>
      </Appbar.Header>

      <ReminderPermissionBanner />

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.content}>
          <DateStrip
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            completionByDate={completionByDate}
          />
  
          <Card style={styles.panel}>
            <Card.Content>
              {doses.length === 0 ? (
                <Text style={styles.panelEmpty}>{t('home.emptyDay')}</Text>
              ) : (
                doses.map((dose) => {
                  const med = meds.find((m) => m.id === dose.medicationId);
                  const isLogged = ['taken', 'skipped', 'missed'].includes(dose.status);
                  const isActionable =
                    (dose.status === 'pending' || dose.status === 'snoozed') &&
                    canLogDoseForTodayOrPast(dose);
                  return (
                    <Card
                      key={dose.id}
                      style={styles.doseCard}
                      onPress={
                        isLogged
                          ? () => {
                              setEditDose(dose);
                              setEditStatus(dose.status);
                            }
                          : undefined
                      }
                    >
                      <Card.Content>
                        <Text variant="titleMedium">{med?.nickname ?? med?.name ?? t('home.medicationFallback')}</Text>
                        <Text variant="bodySmall">
                          {dose.status === 'snoozed'
                            ? t('home.snoozedUntil', {
                                time: formatScheduledTime(originalScheduledAt(dose)),
                                until: formatScheduledTime(dose.scheduledAt),
                              })
                            : t('home.statusLine', {
                                time: formatScheduledTime(dose.scheduledAt),
                                status: getDoseStatusLabel(dose.status),
                              })}
                          {med && med.currentQuantity > 0
                            ? ` · ${t('home.remaining', { count: med.currentQuantity })}`
                            : ''}
                        </Text>
                        {!isActionable ? null : (
                          <View style={styles.actions}>
                            <Button mode="contained" onPress={() => handleTaken(dose)} accessibilityLabel={t('home.markTaken')}>
                              {t('common.taken')}
                            </Button>
                            <Button mode="outlined" onPress={() => handleSkip(dose)} accessibilityLabel={t('home.skipDose')}>
                              {t('common.skip')}
                            </Button>
                            <Button mode="text" onPress={() => setSnoozeDose(dose)} accessibilityLabel={t('common.snooze')}>
                              {t('common.snooze')}
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
            accessibilityLabel={t('home.openLibrary')}
          >
            <Card.Content>
              <View style={styles.panelHeader}>
                <Text variant="titleMedium">{t('home.yourMedications')}</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={healthOsTheme.colors.onSurfaceVariant}
                />
              </View>
              {meds.length === 0 ? (
                <Text variant="bodyMedium" style={styles.panelHint}>
                  {t('home.addHint')}
                </Text>
              ) : (
                <Text variant="bodyMedium" style={styles.panelHint}>
                  {meds.length === 1
                    ? t('home.libraryCountOne')
                    : t('home.libraryCount', { count: meds.length })}
                </Text>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        <FAB icon="plus" style={styles.fab} onPress={navigateToAddMedication} accessibilityLabel={t('home.addMedication')} />
      </View>

      <AppUpdateBanner />


      <SnoozeTimeDialog
        visible={!!snoozeDose}
        onDismiss={() => setSnoozeDose(null)}
        onConfirm={(snoozeUntil) => void confirmSnooze(snoozeUntil)}
      />

      <Portal>
        <Dialog visible={!!editDose} onDismiss={() => setEditDose(null)}>
          <Dialog.Title>{t('home.editDose')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={(v) => setEditStatus(v as DoseStatus)} value={editStatus}>
              {DOSE_STATUS_OPTIONS.filter((option) => {
                if (option.value === 'snoozed') return false;
                if (
                  option.value === 'taken' &&
                  editDose &&
                  !canLogDoseForTodayOrPast(editDose)
                ) {
                  return false;
                }
                return true;
              }).map((option) => (
                <RadioButton.Item
                  key={option.value}
                  label={getDoseStatusLabel(option.value)}
                  value={option.value}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDose(null)}>{t('common.cancel')}</Button>
            <Button onPress={handleDeleteDose} textColor="#CF6679">
              {t('common.delete')}
            </Button>
            <Button mode="contained" onPress={handleSaveEdit}>
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: healthOsTheme.colors.background },
  body: { flex: 1 },
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
