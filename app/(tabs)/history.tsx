import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Appbar, Button, Card, Dialog, Portal, RadioButton, Text } from 'react-native-paper';
import { formatDateKey, formatScheduledTime } from '@/src/core/dates/dateUtils';
import { DateStrip } from '@/src/core/components/DateStrip';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { DoseEventRepository, MedicationRepository } from '@/src/features/medications/medicationRepository';
import { InventoryService } from '@/src/features/inventory/inventoryService';
import type { DoseEvent } from '@/src/db/schema';
import type { DoseStatus } from '@/src/core/types/domain';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export default function HistoryScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editDose, setEditDose] = useState<DoseEvent | null>(null);
  const [editStatus, setEditStatus] = useState<DoseStatus>('taken');
  const dbState = useDatabaseBootstrap();
  const dateKey = formatDateKey(selectedDate);

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
        <Appbar.Content title="History" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content}>
        <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} mode="past" />
        {doses.length === 0 ? (
          <Text style={styles.empty}>No doses logged for this day.</Text>
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
                    {formatScheduledTime(dose.scheduledAt)} — {dose.status}
                  </Text>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

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
            <Button onPress={handleDelete} textColor="#CF6679">
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
  content: { paddingBottom: 32 },
  card: { marginHorizontal: 16, marginBottom: 8 },
  empty: { marginHorizontal: 16, color: healthOsTheme.colors.onSurfaceVariant },
});
