import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
  getInventoryQuantityPrompt,
  supportsDualColor,
  type ScheduleType,
} from '@/src/core/types/domain';
import { useWizardStore } from '@/src/features/medications/wizardStore';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { MedicationRepository } from '@/src/features/medications/medicationRepository';
import { removeMedicationWithReminders } from '@/src/features/medications/medicationDeletionService';
import { ReminderReconciler, scheduleAlarms } from '@/src/features/reminders/reminderService';
import { generateUpcomingDoseEvents, resyncPendingDosesAfterScheduleUpdate } from '@/src/features/medications/doseGenerationService';
import {
  findDuplicateMedicationConflict,
  proposedSchedulePeriod,
  type DuplicateMedicationConflict,
} from '@/src/features/medications/duplicateMedicationService';
import { DuplicateMedicationDialog } from '@/src/core/components/DuplicateMedicationDialog';
import { t, tCount } from '@/src/i18n/translate';
import { useT } from '@/src/i18n/useT';

function getFrequencyLabel(type?: ScheduleType, intervalDays?: number): string {
  if (type === 'interval_days' && intervalDays) {
    return tCount('schedule.everyNDaysOne', 'schedule.everyNDays', intervalDays);
  }
  if (type === 'fixed_daily') return t('schedule.everyDay');
  if (type === 'weekdays') return t('schedule.everyWeek');
  if (type === 'monthly') return t('schedule.everyMonth');
  if (type === 'as_needed') return t('schedule.asNeeded');
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
  const { t } = useT();
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
  const [duplicateConflict, setDuplicateConflict] = useState<DuplicateMedicationConflict | null>(
    null,
  );
  const scrollRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Record<string, number>>({});
  const [keyboardInset, setKeyboardInset] = useState(0);

  const registerFieldOffset = (key: string, y: number) => {
    fieldOffsets.current[key] = y;
  };

  const scrollFieldIntoView = (key: string) => {
    const scroll = () => {
      const y = fieldOffsets.current[key];
      if (y == null) return;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
    };
    requestAnimationFrame(scroll);
    if (Platform.OS === 'android') {
      setTimeout(scroll, 100);
    }
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardInset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
  const quantityPrompt = getInventoryQuantityPrompt(draft.medicationType);

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
      const conflict = findDuplicateMedicationConflict(
        medRepo,
        input.name,
        proposedSchedulePeriod(input.schedule.startDate, input.schedule.endDate),
        isEditing ? editingMedicationId : undefined,
      );
      if (conflict) {
        setDuplicateConflict(conflict);
        return;
      }

      if (isEditing && editingMedicationId) {
        const saved = medRepo.update(editingMedicationId, input);
        if (!saved) {
          setSaveError(t('review.saveMissing'));
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
      setSaveError(t('review.saveFailed'));
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + keyboardInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      <View style={styles.previewCard}>
        <Pressable
          style={styles.previewDetailsEditBtn}
          onPress={() => router.push('/medicine/configure')}
          accessibilityRole="button"
          accessibilityLabel={t('review.editName')}
        >
          <Text style={styles.editBtnText}>{t('common.edit')}</Text>
        </Pressable>
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
            accessibilityLabel={t('review.editShape')}
          >
            <MaterialCommunityIcons name="pencil" size={16} color={healthOsTheme.colors.onSurface} />
          </Pressable>
        </View>
        <Text style={styles.medName}>{draft.name}</Text>
        <Text style={styles.medSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('review.schedule')}</Text>
          <Pressable
            style={styles.editBtn}
            onPress={() => router.push('/medicine/schedule')}
            accessibilityRole="button"
            accessibilityLabel={t('review.editSchedule')}
          >
            <Text style={styles.editBtnText}>{t('common.edit')}</Text>
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
          <Text style={styles.scheduleText}>{t('review.starting', { date: formatDisplayDate(draft.startDate) })}</Text>
        </View>
        {endDate ? (
          <View style={styles.scheduleRow}>
            <MaterialCommunityIcons
              name="calendar-remove-outline"
              size={20}
              color={healthOsTheme.colors.onSurfaceVariant}
              style={styles.rowIcon}
            />
            <Text style={styles.scheduleText}>{t('review.ending', { date: formatDisplayDate(endDate) })}</Text>
          </View>
        ) : null}
      </View>

      <View
        style={styles.card}
        onLayout={(event) => registerFieldOffset('quantity', event.nativeEvent.layout.y)}
      >
        <Text style={styles.cardTitle}>{t('review.quantity')}</Text>
        <TextInput
          placeholder={quantityPrompt}
          value={quantity}
          onChangeText={setQuantity}
          onFocus={() => scrollFieldIntoView('quantity')}
          keyboardType="numeric"
          mode="flat"
          style={styles.quantityInput}
          underlineColor={healthOsTheme.colors.outline}
          activeUnderlineColor={healthOsTheme.colors.primary}
          accessibilityLabel={quantityPrompt}
        />
        <View style={styles.refillRow}>
          <Text style={styles.refillLabel}>{t('review.refillReminder')}</Text>
          <Switch
            value={refillOn}
            onValueChange={(v) => {
              setRefillOn(v);
              if (v) setRefillDialog(true);
              else setRefillThreshold('');
            }}
            color={healthOsTheme.colors.primary}
            accessibilityLabel={t('review.refillReminder')}
          />
        </View>
        {refillOn && refillThreshold ? (
          <Text style={styles.refillHint}>
            {t('review.belowHint', { count: refillThreshold })}
          </Text>
        ) : null}
        {refillOn ? (
          <Button mode="text" onPress={() => setRefillDialog(true)} style={styles.refillEditBtn}>
            {refillThreshold ? t('review.changeThreshold') : t('review.setThreshold')}
          </Button>
        ) : null}
      </View>

      <View
        style={styles.nicknameSection}
        onLayout={(event) => registerFieldOffset('nickname', event.nativeEvent.layout.y)}
      >
        <TextInput
          placeholder={t('review.nickname')}
          value={nickname}
          onChangeText={setNickname}
          onFocus={() => scrollFieldIntoView('nickname')}
          mode="outlined"
          left={<TextInput.Icon icon="pill" />}
          style={styles.fieldInput}
          accessibilityLabel={t('review.nickname')}
        />
        <Text style={styles.nicknameHint}>
          {t('review.nicknameHint')}
        </Text>
      </View>

      <View onLayout={(event) => registerFieldOffset('notes', event.nativeEvent.layout.y)}>
        <TextInput
          placeholder={t('review.notes')}
          value={notes}
          onChangeText={setNotes}
          onFocus={() => scrollFieldIntoView('notes')}
          mode="outlined"
          multiline
          left={<TextInput.Icon icon="note-text-outline" />}
          style={[styles.fieldInput, styles.notesInput]}
          accessibilityLabel={t('review.notes')}
        />
      </View>

      <Button
        mode="contained"
        disabled={!canSave || saving}
        loading={saving}
        onPress={() => void handleSave()}
        style={styles.saveBtn}
        accessibilityLabel={isEditing ? t('review.saveChanges') : t('review.saveMedication')}
      >
        {t('common.save')}
      </Button>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

      {isEditing && (
        <Button
          mode="outlined"
          textColor={healthOsTheme.colors.error}
          onPress={() => setDeleteDialog(true)}
          style={styles.deleteBtn}
          accessibilityLabel={t('review.deleteMedication')}
        >
          {t('review.deleteMedication')}
        </Button>
      )}

      <Portal>
        <Dialog visible={refillDialog} onDismiss={() => setRefillDialog(false)}>
          <Dialog.Title>{t('review.thresholdTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.refillDialogBody}>
              {t('review.thresholdBody')}
            </Text>
            <TextInput
              label={t('review.remindWhenBelow')}
              value={refillThreshold}
              onChangeText={setRefillThreshold}
              keyboardType="numeric"
              accessibilityLabel={t('review.thresholdTitle')}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRefillDialog(false)}>{t('common.done')}</Button>
          </Dialog.Actions>
        </Dialog>

        <DuplicateMedicationDialog
          visible={duplicateConflict != null}
          conflict={duplicateConflict}
          onDismiss={() => setDuplicateConflict(null)}
          onEditExisting={() => {
            if (!duplicateConflict) return;
            const medicationId = duplicateConflict.medication.id;
            setDuplicateConflict(null);
            reset();
            router.replace(`/medicine/${medicationId}`);
          }}
        />

        <Dialog visible={deleteDialog} onDismiss={() => !deleting && setDeleteDialog(false)}>
          <Dialog.Title>{t('review.deleteTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text>
              {t('review.deleteBody', { name: draft.nickname ?? draft.name })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialog(false)} disabled={deleting}>
              {t('common.cancel')}
            </Button>
            <Button
              textColor={healthOsTheme.colors.error}
              onPress={() => void confirmDelete()}
              loading={deleting}
              disabled={deleting}
            >
              {t('common.delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: healthOsTheme.colors.background,
  },
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
    position: 'relative',
  },
  previewDetailsEditBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    zIndex: 1,
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
  notesInput: {
    minHeight: 120,
  },
  nicknameSection: {
    gap: 8,
  },
  nicknameHint: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
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
