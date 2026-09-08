import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Dialog, Portal, Switch, Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { PillShapeIcon, SHAPE_PREVIEW_COLOR } from '@/src/core/components/PillShapeIcon';
import { formatDisplayDate, formatTime24, hasScheduleEndDate } from '@/src/core/dates/dateUtils';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import {
  formatDoseLabel,
  formatStrengthSubtitle,
  FREQUENCY_OPTIONS,
  getDefaultDoseAmount,
  supportsDualColor,
  type ScheduleType,
} from '@/src/core/types/domain';
import { useWizardStore } from '@/src/features/medications/wizardStore';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { MedicationRepository } from '@/src/features/medications/medicationRepository';
import { removeMedicationWithReminders } from '@/src/features/medications/medicationDeletionService';
import { ReminderReconciler, scheduleAlarms } from '@/src/features/reminders/reminderService';
import { generateUpcomingDoseEvents, resyncPendingDosesAfterScheduleUpdate } from '@/src/features/medications/doseGenerationService';

function getFrequencyLabel(type?: ScheduleType, intervalDays?: number): string {
  if (type === 'interval_days' && intervalDays) {
    return `Every ${intervalDays} days`;
  }
  return FREQUENCY_OPTIONS.find((f) => f.type === type)?.label ?? '';
}

function buildSaveInput(
  draft: ReturnType<typeof useWizardStore.getState>['draft'],
  nickname: string,
  notes: string,
  quantity: string,
  refillOn: boolean,
  refillThreshold: string,
) {
  const qty = parseInt(quantity, 10) || 0;
  const threshold = refillOn ? parseInt(refillThreshold, 10) || null : null;

  return {
    name: draft.name,
    nickname: nickname || undefined,
    notes: notes || undefined,
    medicationType: draft.medicationType!,
    strengthValue: draft.strengthValue,
    strengthUnit: draft.strengthUnit,
    doseUnitValue: draft.doseUnitValue,
    doseUnitUnit: draft.doseUnitUnit,
    pillShape: draft.pillShape,
    pillColor: draft.pillColor,
    pillColor2: draft.pillColor2,
    photoUri: draft.photoUri,
    currentQuantity: qty,
    refillEnabled: refillOn,
    refillThreshold: threshold,
    schedule: {
      type: draft.frequency!,
      timesOfDay: draft.timesOfDay,
      intervalDays: draft.intervalDays,
      weekdayMask: draft.weekdayMask,
      dayOfMonth: draft.dayOfMonth,
      startDate: draft.startDate,
      endDate: hasScheduleEndDate(draft.endDate) ? draft.endDate!.trim() : undefined,
    },
  };
}

export function MedicationReviewView() {
  const { draft, setInventory, setNicknameNotes, reset, editingMedicationId, editSessionKey } =
    useWizardStore();
  const dbState = useDatabaseBootstrap();
  const [quantity, setQuantity] = useState(String(draft.currentQuantity || ''));
  const [refillDialog, setRefillDialog] = useState(false);
  const [refillThreshold, setRefillThreshold] = useState('');
  const [refillOn, setRefillOn] = useState(draft.refillEnabled);
  const [nickname, setNickname] = useState(draft.nickname ?? '');
  const [notes, setNotes] = useState(draft.notes ?? '');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEditing = !!editingMedicationId;

  useEffect(() => {
    setQuantity(String(draft.currentQuantity || ''));
    setRefillOn(draft.refillEnabled);
    setRefillThreshold(
      draft.refillThreshold != null ? String(draft.refillThreshold) : '',
    );
    setNickname(draft.nickname ?? '');
    setNotes(draft.notes ?? '');
  }, [editSessionKey]);

  const previewColor = draft.pillColor ?? SHAPE_PREVIEW_COLOR;
  const showDualTone = supportsDualColor(draft.pillShape) && draft.pillColor2 != null;
  const subtitle = formatStrengthSubtitle(
    draft.medicationType,
    draft.strengthValue,
    draft.strengthUnit,
    draft.doseUnitValue,
    draft.doseUnitUnit,
  );
  const endDate = hasScheduleEndDate(draft.endDate) ? draft.endDate!.trim() : undefined;
  const doseLabelOptions = {
    strengthValue: draft.strengthValue,
    strengthUnit: draft.strengthUnit,
    doseUnitValue: draft.doseUnitValue,
    doseUnitUnit: draft.doseUnitUnit,
  };
  const defaultDoseAmount = getDefaultDoseAmount(draft.medicationType, doseLabelOptions);

  const canSave =
    !!draft.name &&
    !!draft.medicationType &&
    !!draft.frequency &&
    (draft.frequency === 'as_needed' || draft.timesCountSet) &&
    (!refillOn || (parseInt(refillThreshold, 10) || 0) > 0);

  const persistAfterSave = async () => {
    if (dbState.status !== 'ready') return;

    generateUpcomingDoseEvents(dbState.db, 14);
    const reconciler = new ReminderReconciler(dbState.db);
    await scheduleAlarms(reconciler.reconcile(7));
  };

  const handleSave = async () => {
    if (!canSave || dbState.status !== 'ready' || saving) return;

    setSaving(true);
    setSaveError(null);
    try {
      const input = buildSaveInput(draft, nickname, notes, quantity, refillOn, refillThreshold);
      const medRepo = new MedicationRepository(dbState.db);

      if (isEditing && editingMedicationId) {
        const saved = medRepo.update(editingMedicationId, input);
        if (!saved) {
          setSaveError('Medication could not be saved. It may have been removed.');
          return;
        }
        const schedules = medRepo.getActiveSchedules(editingMedicationId);
        if (schedules[0]) {
          resyncPendingDosesAfterScheduleUpdate(dbState.db, schedules[0].id);
        }
      } else {
        medRepo.create(input);
      }

      setInventory(parseInt(quantity, 10) || 0, refillOn, parseInt(refillThreshold, 10) || undefined);
      setNicknameNotes(nickname || undefined, notes || undefined);

      try {
        await persistAfterSave();
      } catch {
        // Medication saved; alarm scheduling is best-effort.
      }

      reset();
      router.replace('/');
    } catch {
      setSaveError('Something went wrong while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (dbState.status !== 'ready' || !editingMedicationId || deleting) return;

    setDeleting(true);
    try {
      await removeMedicationWithReminders(dbState.db, editingMedicationId);
      setDeleteDialog(false);
      reset();
      router.replace('/(tabs)/library');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.previewCard}>
        <View style={styles.previewCircleWrap}>
          <View style={styles.previewCircle}>
            {draft.photoUri ? (
              <Image
                source={{ uri: draft.photoUri }}
                style={styles.previewPhoto}
                accessibilityIgnoresInvertColors
              />
            ) : draft.pillShape ? (
              <PillShapeIcon
                shape={draft.pillShape}
                color={previewColor}
                color2={showDualTone ? draft.pillColor2 : undefined}
                size={72}
              />
            ) : null}
          </View>
          <Pressable
            style={styles.previewEditBtn}
            onPress={() => router.push('/medicine/shape')}
            accessibilityRole="button"
            accessibilityLabel="Edit shape and colour"
          >
            <MaterialCommunityIcons name="pencil" size={16} color={healthOsTheme.colors.onSurface} />
          </Pressable>
        </View>
        <Text style={styles.medName}>{draft.name}</Text>
        <Text style={styles.medSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Schedule</Text>
          <Pressable
            style={styles.editBtn}
            onPress={() => router.push('/medicine/schedule')}
            accessibilityRole="button"
            accessibilityLabel="Edit schedule"
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.scheduleRow}>
          <MaterialCommunityIcons
            name="repeat"
            size={20}
            color={healthOsTheme.colors.onSurfaceVariant}
            style={styles.rowIcon}
          />
          <Text style={styles.scheduleText}>
            {getFrequencyLabel(draft.frequency, draft.intervalDays)}
          </Text>
        </View>

        {draft.frequency !== 'as_needed' &&
          draft.timesOfDay.map((time, index) => (
            <View key={index} style={[styles.scheduleRow, index > 0 && styles.scheduleRowIndented]}>
              {index === 0 ? (
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color={healthOsTheme.colors.onSurfaceVariant}
                  style={styles.rowIcon}
                />
              ) : (
                <View style={styles.rowIconSpacer} />
              )}
              <Text style={styles.scheduleText}>
                {formatTime24(time.hour, time.minute)},{' '}
                {formatDoseLabel(time.doseAmount ?? defaultDoseAmount, draft.medicationType, doseLabelOptions)}
              </Text>
            </View>
          ))}

        <View style={styles.scheduleRow}>
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={20}
            color={healthOsTheme.colors.onSurfaceVariant}
            style={styles.rowIcon}
          />
          <Text style={styles.scheduleText}>Starting {formatDisplayDate(draft.startDate)}</Text>
        </View>
        {endDate ? (
          <View style={styles.scheduleRow}>
            <MaterialCommunityIcons
              name="calendar-remove-outline"
              size={20}
              color={healthOsTheme.colors.onSurfaceVariant}
              style={styles.rowIcon}
            />
            <Text style={styles.scheduleText}>Ending {formatDisplayDate(endDate)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quantity</Text>
        <TextInput
          placeholder="Number of remaining pills"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          mode="flat"
          style={styles.quantityInput}
          underlineColor={healthOsTheme.colors.outline}
          activeUnderlineColor={healthOsTheme.colors.primary}
          accessibilityLabel="Number of remaining pills"
        />
        <View style={styles.refillRow}>
          <Text style={styles.refillLabel}>Refill reminder</Text>
          <Switch
            value={refillOn}
            onValueChange={(v) => {
              setRefillOn(v);
              if (v) setRefillDialog(true);
              else setRefillThreshold('');
            }}
            color={healthOsTheme.colors.primary}
            accessibilityLabel="Refill reminder"
          />
        </View>
        {refillOn && refillThreshold ? (
          <Text style={styles.refillHint}>
            Remind when remaining quantity falls below {refillThreshold}
          </Text>
        ) : null}
        {refillOn ? (
          <Button mode="text" onPress={() => setRefillDialog(true)} style={styles.refillEditBtn}>
            {refillThreshold ? 'Change threshold' : 'Set threshold'}
          </Button>
        ) : null}
      </View>

      <TextInput
        placeholder="Medication nickname"
        value={nickname}
        onChangeText={setNickname}
        mode="outlined"
        left={<TextInput.Icon icon="pill" />}
        style={styles.fieldInput}
        accessibilityLabel="Medication nickname"
      />
      <Text style={styles.nicknameHint}>
        If you set a nickname, the nickname will be used throughout the Medication tracker.
      </Text>

      <TextInput
        placeholder="Notes"
        value={notes}
        onChangeText={setNotes}
        mode="outlined"
        multiline
        left={<TextInput.Icon icon="note-text-outline" />}
        style={styles.fieldInput}
        accessibilityLabel="Notes"
      />

      <Button
        mode="contained"
        disabled={!canSave || saving}
        loading={saving}
        onPress={() => void handleSave()}
        style={styles.saveBtn}
        accessibilityLabel={isEditing ? 'Save changes' : 'Save medication'}
      >
        Save
      </Button>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

      {isEditing && (
        <Button
          mode="outlined"
          textColor={healthOsTheme.colors.error}
          onPress={() => setDeleteDialog(true)}
          style={styles.deleteBtn}
          accessibilityLabel="Delete medication"
        >
          Delete medication
        </Button>
      )}

      <Portal>
        <Dialog visible={refillDialog} onDismiss={() => setRefillDialog(false)}>
          <Dialog.Title>Refill reminder threshold</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.refillDialogBody}>
              Remind you when the remaining quantity drops below this number.
            </Text>
            <TextInput
              label="Remind when below"
              value={refillThreshold}
              onChangeText={setRefillThreshold}
              keyboardType="numeric"
              accessibilityLabel="Refill reminder threshold"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRefillDialog(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={deleteDialog} onDismiss={() => !deleting && setDeleteDialog(false)}>
          <Dialog.Title>Delete medication?</Dialog.Title>
          <Dialog.Content>
            <Text>
              {draft.nickname ?? draft.name} will be removed along with its schedule, doses, and
              reminders. This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              textColor={healthOsTheme.colors.error}
              onPress={() => void confirmDelete()}
              loading={deleting}
              disabled={deleting}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
    backgroundColor: healthOsTheme.colors.background,
  },
  previewCard: {
    backgroundColor: healthOsTheme.colors.surface,
    borderRadius: 20,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  previewCircleWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  previewCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  previewEditBtn: {
    position: 'absolute',
    top: 0,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    borderWidth: 2,
    borderColor: healthOsTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medName: {
    color: healthOsTheme.colors.onSurface,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  medSubtitle: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 15,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: healthOsTheme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    color: healthOsTheme.colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  editBtn: {
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  editBtnText: {
    color: healthOsTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scheduleRowIndented: {
    paddingLeft: 0,
  },
  rowIcon: {
    width: 28,
    marginRight: 8,
  },
  rowIconSpacer: {
    width: 28,
    marginRight: 8,
  },
  scheduleText: {
    color: healthOsTheme.colors.onSurface,
    fontSize: 15,
    flex: 1,
  },
  quantityInput: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    marginTop: 4,
  },
  refillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 8,
  },
  refillLabel: {
    color: healthOsTheme.colors.onSurface,
    fontSize: 16,
  },
  refillHint: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  refillEditBtn: {
    alignSelf: 'flex-start',
    marginTop: -4,
    marginBottom: 4,
  },
  refillDialogBody: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  fieldInput: {
    backgroundColor: healthOsTheme.colors.surface,
  },
  nicknameHint: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 4,
  },
  saveBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 4,
  },
  deleteBtn: {
    borderRadius: 999,
    borderColor: healthOsTheme.colors.error,
  },
  errorText: {
    color: healthOsTheme.colors.error,
    textAlign: 'center',
    fontSize: 14,
  },
});
