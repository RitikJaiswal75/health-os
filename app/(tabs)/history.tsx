import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { startOfDay } from 'date-fns';
import { Appbar, Button, Card, Dialog, Portal, RadioButton, Text } from 'react-native-paper';
import { formatDateKey, formatScheduledTime, parseDateKey } from '@/src/core/dates/dateUtils';
import { HistoryDateNavigator } from '@/src/core/components/HistoryDateNavigator';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { DoseEventRepository, MedicationRepository } from '@/src/features/medications/medicationRepository';
import { InventoryService } from '@/src/features/inventory/inventoryService';
import type { DoseEvent } from '@/src/db/schema';
import { DOSE_STATUS_OPTIONS, getDoseStatusLabel, type DoseStatus } from '@/src/core/types/domain';
import { canLogDoseForTodayOrPast, originalScheduledAt } from '@/src/features/medications/doseSlotUtils';
import { ReminderPermissionBanner } from '@/src/core/components/ReminderPermissionBanner';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

export default function HistoryScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editDose, setEditDose] = useState<DoseEvent | null>(null);
  const [editStatus, setEditStatus] = useState<DoseStatus>('taken');
  const dbState = useDatabaseBootstrap();
  const { t } = useT();
  const dateKey = formatDateKey(selectedDate);
  const earliestHistoryDate = useMemo(() => {
    if (dbState.status !== 'ready') return startOfDay(new Date());
    const earliestKey = new DoseEventRepository(dbState.db).getEarliestHistoryDateKey();
    return earliestKey ? parseDateKey(earliestKey) : startOfDay(new Date());
  }, [dbState]);

  const doses =
    dbState.status === 'ready'
      ? (() => {
          const medRepo = new MedicationRepository(dbState.db);
          const activeMedIds = new Set(medRepo.getAll().map((med) => med.id));
          return new DoseEventRepository(dbState.db).getForDate(dateKey, activeMedIds);
        })()
      : [];
  const medRepo = dbState.status === 'ready' ? new MedicationRepository(dbState.db) : null;

  const refresh = () => setSelectedDate(new Date(selectedDate));

  const handleSaveEdit = () => {
    if (!editDose || dbState.status !== 'ready' || !medRepo) return;
    if (editStatus === 'taken' && !canLogDoseForTodayOrPast(editDose)) return;
    const doseRepo = new DoseEventRepository(dbState.db);
    const inventory = new InventoryService(dbState.db, medRepo, doseRepo);
    inventory.applyStatusChange(editDose.id, editDose.status as DoseStatus, editStatus);
    doseRepo.updateStatus(editDose.id, editStatus);
    setEditDose(null);
    refresh();
  };

  const handleDelete = () => {
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
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t('history.title')} />
      </Appbar.Header>

      <ReminderPermissionBanner />

      <ScrollView contentContainerStyle={styles.content}>
        <HistoryDateNavigator
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          minDate={earliestHistoryDate}
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
                  setEditStatus(dose.status as DoseStatus);
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
                          status: getDoseStatusLabel(dose.status as DoseStatus),
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
