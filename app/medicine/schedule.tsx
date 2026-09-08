import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, RadioButton, Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { TimeDosageDialog } from '@/src/core/components/TimeDosageDialog';
import { DoseAmountDialog } from '@/src/core/components/DoseAmountDialog';
import { formatDateKey, formatDisplayDate, formatTime24, hasScheduleEndDate, parseDateKey } from '@/src/core/dates/dateUtils';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { formatDoseLabel, FREQUENCY_OPTIONS, getDefaultDoseAmount, type ScheduleType } from '@/src/core/types/domain';
import { useWizardStore } from '@/src/features/medications/wizardStore';

const WEEKDAYS = [
  { label: 'S', bit: 1 << 0 },
  { label: 'M', bit: 1 << 1 },
  { label: 'T', bit: 1 << 2 },
  { label: 'W', bit: 1 << 3 },
  { label: 'T', bit: 1 << 4 },
  { label: 'F', bit: 1 << 5 },
  { label: 'S', bit: 1 << 6 },
];

type DatePickerTarget = 'start' | 'end' | null;

export default function ScheduleScreen() {
  const {
    draft,
    setFrequency,
    setTimesPerDay,
    setTimeAtIndex,
    setScheduleDates,
    canProceedSchedule,
    editingMedicationId,
  } = useWizardStore();

  const [timesDialog, setTimesDialog] = useState(false);
  const [datePicker, setDatePicker] = useState<DatePickerTarget>(null);
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);
  const [doseEditIndex, setDoseEditIndex] = useState<number | null>(null);
  const [intervalInput, setIntervalInput] = useState(String(draft.intervalDays ?? 2));
  const [dayOfMonthInput, setDayOfMonthInput] = useState(String(draft.dayOfMonth ?? 1));
  const [weekdayMask, setWeekdayMask] = useState(draft.weekdayMask ?? 1 << 1);

  const doseLabelOptions = {
    strengthValue: draft.strengthValue,
    strengthUnit: draft.strengthUnit,
    doseUnitValue: draft.doseUnitValue,
    doseUnitUnit: draft.doseUnitUnit,
  };
  const defaultDoseAmount = getDefaultDoseAmount(draft.medicationType, doseLabelOptions);

  useEffect(() => {
    if (!draft.frequency) {
      setFrequency('fixed_daily');
    }
  }, [draft.frequency, setFrequency]);

  const applyFrequency = (type: ScheduleType) => {
    const extras: Record<string, number | undefined> = {};
    if (type === 'interval_days') {
      extras.intervalDays = parseInt(intervalInput, 10) || 2;
    }
    if (type === 'weekdays') {
      extras.weekdayMask = weekdayMask || (1 << 1);
    }
    if (type === 'monthly') {
      extras.dayOfMonth = parseInt(dayOfMonthInput, 10) || 1;
    }
    setFrequency(type, extras);
  };

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    const target = datePicker;
    if (Platform.OS === 'android') {
      setDatePicker(null);
      if (event.type === 'dismissed' || !date) return;
    } else if (!date) {
      return;
    }
    if (!target) return;

    const key = formatDateKey(date);
    if (target === 'start') {
      setScheduleDates(key, draft.endDate);
    } else {
      setScheduleDates(draft.startDate, key);
    }
  };

  const clearEndDate = () => setScheduleDates(draft.startDate, undefined);

  const onTimeChange = (_: unknown, date?: Date) => {
    if (timePickerIndex === null) return;
    if (Platform.OS === 'android') setTimePickerIndex(null);
    if (date) {
      const current = draft.timesOfDay[timePickerIndex];
      setTimeAtIndex(timePickerIndex, {
        ...current,
        hour: date.getHours(),
        minute: date.getMinutes(),
      });
    }
  };

  const showTimeSection = draft.frequency && draft.frequency !== 'as_needed';
  const canNext = canProceedSchedule();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.question}>
            How often do you take {draft.name || 'this medication'}?
          </Text>
          <RadioButton.Group
            onValueChange={(v) => applyFrequency(v as ScheduleType)}
            value={draft.frequency ?? 'fixed_daily'}
          >
            {FREQUENCY_OPTIONS.map((option, index) => (
              <View key={option.type}>
                {index > 0 && <View style={styles.rowDivider} />}
                <RadioButton.Item
                  label={option.label}
                  value={option.type}
                  labelStyle={styles.radioLabel}
                  color={healthOsTheme.colors.primary}
                  uncheckedColor={healthOsTheme.colors.onSurfaceVariant}
                  style={styles.radioItem}
                  position="leading"
                />
              </View>
            ))}
          </RadioButton.Group>
        </View>
      </View>

      {draft.frequency === 'interval_days' && (
        <TextInput
          label="Every how many days?"
          value={intervalInput}
          onChangeText={setIntervalInput}
          keyboardType="numeric"
          mode="outlined"
          onBlur={() =>
            setFrequency('interval_days', { intervalDays: parseInt(intervalInput, 10) || 2 })
          }
          accessibilityLabel="Interval days"
        />
      )}

      {draft.frequency === 'weekdays' && (
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((d, i) => {
            const selected = (weekdayMask & d.bit) !== 0;
            return (
              <Pressable
                key={`${d.label}-${i}`}
                style={[styles.weekdayChip, selected && styles.weekdayChipSelected]}
                onPress={() => {
                  const next = weekdayMask & d.bit ? weekdayMask & ~d.bit : weekdayMask | d.bit;
                  setWeekdayMask(next);
                  setFrequency('weekdays', { weekdayMask: next || d.bit });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Weekday ${d.label}`}
                accessibilityState={{ selected }}
              >
                <Text style={[styles.weekdayText, selected && styles.weekdayTextSelected]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {draft.frequency === 'monthly' && (
        <TextInput
          label="Day of month (1–31)"
          value={dayOfMonthInput}
          onChangeText={setDayOfMonthInput}
          keyboardType="numeric"
          mode="outlined"
          onBlur={() => setFrequency('monthly', { dayOfMonth: parseInt(dayOfMonthInput, 10) || 1 })}
          accessibilityLabel="Day of month"
        />
      )}

      {showTimeSection && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time and dosage</Text>
          {!draft.timesCountSet ? (
            <View style={styles.card}>
              <Text style={styles.cardBody}>
                Set this medication&apos;s dosage and get reminders to take it at specific times.
              </Text>
              <Button
                mode="contained"
                onPress={() => setTimesDialog(true)}
                style={styles.actionBtn}
                accessibilityLabel="Set time and dosage"
              >
                Set time and dosage
              </Button>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.timesHeader}>
                <Text style={styles.timesHeaderLabel}>
                  {draft.timesPerDay} {draft.timesPerDay === 1 ? 'time' : 'times'} a day
                </Text>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => setTimesDialog(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit times per day"
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
              </View>
              {draft.timesOfDay.map((time, index) => (
                <View key={index}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <View style={styles.doseRow}>
                    <Pressable
                      style={styles.doseTimeSide}
                      onPress={() => setTimePickerIndex(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Dose ${index + 1} time`}
                    >
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={20}
                        color={healthOsTheme.colors.onSurfaceVariant}
                        style={styles.doseIcon}
                      />
                      <Text style={styles.doseTime}>{formatTime24(time.hour, time.minute)}</Text>
                    </Pressable>
                    <View style={styles.doseDivider} />
                    <Pressable
                      style={styles.doseAmountSide}
                      onPress={() => setDoseEditIndex(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Dose ${index + 1} amount`}
                    >
                      <Text style={styles.doseAmount}>
                        {formatDoseLabel(time.doseAmount ?? defaultDoseAmount, draft.medicationType, doseLabelOptions)}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Text style={styles.timesHint}>
                Check the preset time above and adjust if necessary.
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Duration</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.dateRow}
            onPress={() => setDatePicker('start')}
            accessibilityRole="button"
            accessibilityLabel="Start date"
          >
            <Text style={styles.dateLabel}>Start date</Text>
            <Text style={styles.dateValueAccent}>{formatDisplayDate(draft.startDate)}</Text>
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable
            style={styles.dateRow}
            onPress={() => setDatePicker('end')}
            accessibilityRole="button"
            accessibilityLabel="End date"
          >
            <Text style={styles.dateLabel}>End date</Text>
            <Text style={hasScheduleEndDate(draft.endDate) ? styles.dateValueAccent : styles.dateValueMuted}>
              {hasScheduleEndDate(draft.endDate) ? formatDisplayDate(draft.endDate!.trim()) : 'None'}
            </Text>
          </Pressable>
          {hasScheduleEndDate(draft.endDate) ? (
            <>
              <View style={styles.rowDivider} />
              <Pressable
                style={styles.clearEndDateRow}
                onPress={clearEndDate}
                accessibilityRole="button"
                accessibilityLabel="Remove end date"
              >
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={20}
                  color={healthOsTheme.colors.error}
                  style={styles.clearEndDateIcon}
                />
                <Text style={styles.clearEndDateText}>Remove end date</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminder settings</Text>
        <View style={styles.card}>
          <Text style={styles.cardBody}>
            You&apos;ll get a notification when it&apos;s time to take your medication.
          </Text>
        </View>
      </View>

      <Button
        mode="contained"
        disabled={!canNext}
        onPress={() => {
          if (editingMedicationId) {
            router.push(`/medicine/${editingMedicationId}`);
          } else {
            router.push('/medicine/review');
          }
        }}
        style={styles.next}
        accessibilityLabel="Next"
      >
        Next
      </Button>

      <TimeDosageDialog
        visible={timesDialog}
        timesPerDay={draft.timesPerDay}
        onDismiss={() => setTimesDialog(false)}
        onConfirm={(count) => {
          setTimesPerDay(count);
          setTimesDialog(false);
        }}
      />

      <DoseAmountDialog
        visible={doseEditIndex !== null}
        doseIndex={doseEditIndex ?? 0}
        amount={
          doseEditIndex !== null
            ? (draft.timesOfDay[doseEditIndex]?.doseAmount ?? defaultDoseAmount)
            : defaultDoseAmount
        }
        medicationType={draft.medicationType}
        strengthValue={draft.strengthValue}
        strengthUnit={draft.strengthUnit}
        doseUnitValue={draft.doseUnitValue}
        doseUnitUnit={draft.doseUnitUnit}
        onDismiss={() => setDoseEditIndex(null)}
        onConfirm={(amount) => {
          if (doseEditIndex === null) return;
          const current = draft.timesOfDay[doseEditIndex];
          setTimeAtIndex(doseEditIndex, { ...current, doseAmount: amount });
          setDoseEditIndex(null);
        }}
      />

      {timePickerIndex !== null && (
        <DateTimePicker
          value={(() => {
            const t = draft.timesOfDay[timePickerIndex];
            const d = new Date();
            d.setHours(t.hour, t.minute, 0, 0);
            return d;
          })()}
          mode="time"
          is24Hour
          display="clock"
          onChange={onTimeChange}
        />
      )}

      {datePicker !== null && (
        <DateTimePicker
          value={parseDateKey(datePicker === 'start' ? draft.startDate : draft.endDate ?? draft.startDate)}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    backgroundColor: healthOsTheme.colors.background,
  },
  section: {
    gap: 4,
  },
  question: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 13,
  },
  card: {
    backgroundColor: healthOsTheme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBody: {
    color: healthOsTheme.colors.onSurface,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: healthOsTheme.colors.outline,
    marginHorizontal: 16,
  },
  radioItem: {
    justifyContent: 'flex-start',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 0,
  },
  radioLabel: {
    color: healthOsTheme.colors.onSurface,
    fontSize: 16,
    textAlign: 'left',
    flexGrow: 0,
    flexShrink: 1,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  weekdayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayChipSelected: {
    backgroundColor: healthOsTheme.colors.primary,
  },
  weekdayText: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
  },
  weekdayTextSelected: {
    color: healthOsTheme.colors.onPrimary,
  },
  actionBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  timesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  timesHeaderLabel: {
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
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  doseTimeSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 14,
  },
  doseAmountSide: {
    flex: 1,
    alignItems: 'flex-end',
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 14,
  },
  doseIcon: {
    marginRight: 12,
  },
  doseTime: {
    color: healthOsTheme.colors.onSurface,
    fontSize: 16,
  },
  doseDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: healthOsTheme.colors.outline,
  },
  doseAmount: {
    color: healthOsTheme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  timesHint: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  dateRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateLabel: {
    color: healthOsTheme.colors.onSurface,
    fontSize: 16,
    marginBottom: 4,
  },
  dateValueAccent: {
    color: healthOsTheme.colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  dateValueMuted: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 15,
  },
  clearEndDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  clearEndDateIcon: {
    marginRight: 10,
  },
  clearEndDateText: {
    color: healthOsTheme.colors.error,
    fontSize: 15,
    fontWeight: '500',
  },
  next: {
    marginTop: 12,
  },
});
