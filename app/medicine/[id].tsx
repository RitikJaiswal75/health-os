import { useCallback, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { MedicationRepository } from '@/src/features/medications/medicationRepository';
import { medicationToDraft } from '@/src/features/medications/medicationDraftMapper';
import { MedicationReviewView } from '@/src/features/medications/MedicationReviewView';
import { useWizardStore } from '@/src/features/medications/wizardStore';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dbState = useDatabaseBootstrap();
  const { loadDraftForEdit, editingMedicationId } = useWizardStore();

  useFocusEffect(
    useCallback(() => {
      if (dbState.status !== 'ready' || !id) return;
      if (useWizardStore.getState().editingMedicationId === id) return;

      const medRepo = new MedicationRepository(dbState.db);
      const med = medRepo.getById(id);
      const schedules = medRepo.getActiveSchedules(id);
      if (!med || schedules.length === 0) return;

      loadDraftForEdit(medicationToDraft(med, schedules[0]), id);
    }, [dbState, id, loadDraftForEdit]),
  );

  useEffect(() => {
    if (dbState.status !== 'ready' || !id) return;
    if (useWizardStore.getState().editingMedicationId === id) return;

    const medRepo = new MedicationRepository(dbState.db);
    const med = medRepo.getById(id);
    const schedules = medRepo.getActiveSchedules(id);
    if (!med || schedules.length === 0) return;

    loadDraftForEdit(medicationToDraft(med, schedules[0]), id);
  }, [dbState.status, dbState, id, loadDraftForEdit]);

  if (dbState.status !== 'ready') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const medRepo = new MedicationRepository(dbState.db);
  const med = medRepo.getById(id);
  const schedules = medRepo.getActiveSchedules(id);

  if (!med || schedules.length === 0) {
    return <Text style={styles.empty}>Medication not found.</Text>;
  }

  if (editingMedicationId !== id) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return <MedicationReviewView />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: healthOsTheme.colors.background,
  },
  empty: { padding: 16 },
});
