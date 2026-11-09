import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import { Appbar, Button, Card, Dialog, Portal, RadioButton, Text } from 'react-native-paper';
import { computeDateCompletion, formatDateKey, formatScheduledTime, historyFloorDate, parseDateKey } from '@/src/core/dates/dateUtils';
import { HistoryDateNavigator } from '@/src/core/components/HistoryDateNavigator';
import type { DateCompletion } from '@/src/core/components/DateStrip';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { DoseEventRepository, MedicationRepository } from '@/src/features/medications/medicationRepository';
import { deleteDose, saveDoseEdit } from '@/src/features/inventory/doseTakenService';
import type { DoseEvent } from '@/src/db/types';
import { DOSE_STATUS_OPTIONS, getDoseStatusLabel, type DoseStatus } from '@/src/core/types/domain';
import { canLogDoseForTodayOrPast, originalScheduledAt } from '@/src/features/medications/doseSlotUtils';
import { ReminderPermissionBanner } from '@/src/core/components/ReminderPermissionBanner';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

export default function HistoryScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editDose, setEditDose] = useState<DoseEvent | null>(null);
  const [editStatus, setEditStatus] = useState<DoseStatus>('taken');
  const [refreshKey, setRefreshKey] = useState(0);
  const dbState = useDatabaseBootstrap();
  const { t } = useT();
  const dateKey = formatDateKey(selectedDate);
  // The strip itself goes back to a fixed floor, with or without data. Only the completion rings
  // need the first real dose, so we never scan years of empty days.
  const historyFloor = historyFloorDate();
  const earliestDoseDate = useMemo(() => {
    const earliestKey =
      dbState.status === 'ready' ? new DoseEventRepository(dbState.db).getEarliestHistoryDateKey() : null;
    return earliestKey ? parseDateKey(earliestKey) : startOfDay(new Date());
    // refreshKey: re-read on tab focus, or a medication added meanwhile never gets its rings.
  }, [dbState, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((key) => key + 1);
    }, []),
  );

  const completionByDate = useMemo(() => {
    const completion: Record<string, DateCompletion> = {};
    if (dbState.status !== 'ready') return completion;

    const activeMedIds = new Set(new MedicationRepository(dbState.db).getAll().map((med) => med.id));
    const today = startOfDay(new Date());
    const dayCount = Math.max(differenceInCalendarDays(today, earliestDoseDate), 0) + 1;
    const dateKeys = Array.from({ length: dayCount }, (_, i) =>
      formatDateKey(addDays(earliestDoseDate, i)),
    );

    const dosesByDate = new DoseEventRepository(dbState.db).getForDates(dateKeys, activeMedIds);
    for (const [key, dayDoses] of dosesByDate) {
      completion[key] = computeDateCompletion(dayDoses);
    }
    return completion;
  }, [dbState, earliestDoseDate, refreshKey]);

  const doses = useMemo(() => {
    if (dbState.status !== 'ready') return [];
    const activeMedIds = new Set(new MedicationRepository(dbState.db).getAll().map((med) => med.id));
    return new DoseEventRepository(dbState.db).getForDate(dateKey, activeMedIds);
    // refreshKey: re-read after an edit, delete or tab focus.
  }, [dbState, dateKey, refreshKey]);
  const medRepo = dbState.status === 'ready' ? new MedicationRepository(dbState.db) : null;

  const refresh = () => setRefreshKey((key) => key + 1);

  const handleSaveEdit = () => {
    if (!editDose || dbState.status !== 'ready') return;
    if (!saveDoseEdit(dbState.db, editDose, editStatus)) return;
    setEditDose(null);
    refresh();
  };

  const handleDelete = () => {
    if (!editDose || dbState.status !== 'ready') return;
    if (!deleteDose(dbState.db, editDose)) return;
    setEditDose(null);
    refresh();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t('history.title')} />
      </Appbar.Header>

      <ReminderPermissionBanner />

      <ScrollView contentContainerStyle={styles.content}>
        <HistoryDateNavigator
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          minDate={historyFloor}
          completionByDate={completionByDate}
        />
        {doses.length === 0 ? (
          <Text style={styles.empty}>{t('history.empty')}</Text>
        ) : (
          doses.map((dose) => {
            const med = medRepo?.getById(dose.medicationId);
            return (
              <Card
                key={dose.id}
                style={styles.card}
                onPress={() => {
                  setEditDose(dose);
                  setEditStatus(dose.status);
                }}
              >
                <Card.Content>
                  <Text variant="titleMedium">{med?.nickname ?? med?.name}</Text>
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
                  </Text>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

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
            <Button onPress={handleDelete} textColor="#CF6679">
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
  content: { paddingBottom: 32 },
  card: { marginHorizontal: 16, marginBottom: 8 },
  empty: { marginHorizontal: 16, color: healthOsTheme.colors.onSurfaceVariant },
});
