import { computeDonutRatio, formatTime24, formatDateKey, formatScheduledTime, parseScheduledAt, parseDateKey, scheduledAtToDateKey } from '../src/core/dates/dateUtils';
import { mergeAndRankResults, CACHE_TTL_HOURS, sanitizeFtsQuery, parseCachedResults } from '../src/features/catalog/catalogService';
import { mapIndianMedicineRow, parseIndianMedicineJson } from '../src/features/catalog/indiaMedicineParser';
import { expandOccurrences, computeSnoozeTime, parseTimesOfDay } from '../src/features/reminders/occurrenceExpander';
import {
  permissionHelper,
  resetPermissionCacheForTests,
} from '../src/core/permissions/permissionHelper';

describe('dateUtils', () => {
  it('formats 24h time', () => {
    expect(formatTime24(8, 5)).toBe('08:05');
    expect(formatTime24(23, 0)).toBe('23:00');
  });

  it('computes donut ratio', () => {
    expect(computeDonutRatio(2, 4)).toBe(0.5);
    expect(computeDonutRatio(4, 4)).toBe(1);
    expect(computeDonutRatio(0, 0)).toBe(0);
  });

  it('formats date key', () => {
    expect(formatDateKey(new Date('2026-09-08T12:00:00'))).toBe('2026-09-08');
  });

  it('formats scheduled time in local timezone from UTC storage', () => {
    // 08:22 UTC = 13:52 IST (+5:30)
    const utc = '2026-09-08T08:22:00.000Z';
    const localHours = parseScheduledAt(utc).getHours();
    const localMinutes = parseScheduledAt(utc).getMinutes();
    expect(formatScheduledTime(utc)).toBe(
      `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`,
    );
  });

  it('parses local wall-clock scheduled_at on the same calendar day', () => {
    expect(scheduledAtToDateKey('2026-09-08T20:00:00')).toBe('2026-09-08');
    expect(parseScheduledAt('2026-09-08T20:00:00').getHours()).toBe(20);
  });

  it('parses date keys as local calendar days', () => {
    expect(formatDateKey(parseDateKey('2026-09-08'))).toBe('2026-09-08');
  });

  it('detects when a schedule end date is set', () => {
    const { hasScheduleEndDate } = require('../src/core/dates/dateUtils');
    expect(hasScheduleEndDate(undefined)).toBe(false);
    expect(hasScheduleEndDate(null)).toBe(false);
    expect(hasScheduleEndDate('')).toBe(false);
    expect(hasScheduleEndDate('2026-09-10')).toBe(true);
  });

  it('builds a past-only date strip ending on today', () => {
    const { getPastDateStrip, formatDateKey } = require('../src/core/dates/dateUtils');
    const today = new Date('2026-09-08T15:00:00');
    const strip = getPastDateStrip(7, today);
    expect(strip).toHaveLength(7);
    expect(formatDateKey(strip[0])).toBe('2026-09-02');
    expect(formatDateKey(strip[6])).toBe('2026-09-08');
  });
});

describe('catalogService', () => {
  it('merges and ranks results', () => {
    const merged = mergeAndRankResults(
      [
        [{ id: '1', name: 'Paracetamol', source: 'india', rank: 10 }],
        [{ id: '2', name: 'Paracetamol Extra', source: 'rxterms', rank: 5 }],
      ],
      'Para',
    );
    expect(merged.length).toBe(2);
    expect(merged[0].name).toMatch(/Paracetamol/);
  });

  it('has 24h cache TTL', () => {
    expect(CACHE_TTL_HOURS).toBe(24);
  });

  it('sanitizes FTS query tokens', () => {
    expect(sanitizeFtsQuery('dolo 650')).toBe('"dolo" "650"*');
    expect(sanitizeFtsQuery('***')).toBe('');
  });

  it('parses cached catalog payloads safely', () => {
    expect(parseCachedResults('[]')).toEqual([]);
    expect(parseCachedResults('not-json')).toEqual([]);
  });
});

describe('indiaMedicineParser', () => {
  it('maps active Indian medicine JSON rows', () => {
    const mapped = mapIndianMedicineRow({
      name: 'Dolo 650 Tablet',
      Is_discontinued: 'FALSE',
      pack_size_label: 'strip of 15 tablets',
      short_composition1: 'Paracetamol (650mg)',
      short_composition2: '',
    });

    expect(mapped).toEqual({
      name: 'Dolo 650 Tablet',
      strength: 'Paracetamol (650mg)',
      form: 'strip of 15 tablets',
    });
  });

  it('skips discontinued medicines', () => {
    expect(
      mapIndianMedicineRow({
        name: 'Old Drug',
        Is_discontinued: 'TRUE',
      }),
    ).toBeNull();
  });

  it('parses JSON arrays', () => {
    const drugs = parseIndianMedicineJson(
      JSON.stringify([
        { name: 'Telma 40 Tablet', Is_discontinued: 'FALSE', type: 'allopathy' },
        { name: 'Removed Drug', Is_discontinued: 'TRUE' },
      ]),
    );

    expect(drugs).toEqual([{ name: 'Telma 40 Tablet', form: 'allopathy' }]);
  });
});

describe('occurrenceExpander', () => {
  const baseSchedule = {
    id: 'sched-1',
    medicationId: 'med-1',
    type: 'fixed_daily',
    timesOfDay: JSON.stringify([{ hour: 8, minute: 0, doseAmount: 1 }]),
    intervalDays: null,
    weekdayMask: null,
    dayOfMonth: null,
    startDate: '2026-01-01',
    endDate: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  };

  it('expands daily occurrences', () => {
    const from = new Date('2026-09-08T00:00:00');
    const to = new Date('2026-09-09T23:59:59');
    const occ = expandOccurrences(baseSchedule, from, to);
    expect(occ.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty for as_needed', () => {
    const occ = expandOccurrences({ ...baseSchedule, type: 'as_needed' }, new Date(), new Date());
    expect(occ).toHaveLength(0);
  });

  it('respects inclusive end date when expanding occurrences', () => {
    const schedule = { ...baseSchedule, endDate: '2026-09-09' };
    const onEnd = expandOccurrences(
      schedule,
      new Date('2026-09-09T00:00:00'),
      new Date('2026-09-09T23:59:59'),
    );
    const afterEnd = expandOccurrences(
      schedule,
      new Date('2026-09-10T00:00:00'),
      new Date('2026-09-10T23:59:59'),
    );
    expect(onEnd).toHaveLength(1);
    expect(afterEnd).toHaveLength(0);
  });

  it('scheduleIncludesDateKey treats end date as inclusive', () => {
    const { scheduleIncludesDateKey } = require('../src/features/reminders/occurrenceExpander');
    const schedule = { startDate: '2026-09-08', endDate: '2026-09-10' };
    expect(scheduleIncludesDateKey(schedule, '2026-09-07')).toBe(false);
    expect(scheduleIncludesDateKey(schedule, '2026-09-08')).toBe(true);
    expect(scheduleIncludesDateKey(schedule, '2026-09-10')).toBe(true);
    expect(scheduleIncludesDateKey(schedule, '2026-09-11')).toBe(false);
  });

  it('computes snooze time', () => {
    const from = new Date('2026-09-08T10:00:00');
    const result = computeSnoozeTime(30, from);
    expect(parseScheduledAt(result).getMinutes()).toBe(30);
  });

  it('parses times of day', () => {
    const times = parseTimesOfDay('[{"hour":8,"minute":0}]');
    expect(times[0].hour).toBe(8);
  });
});

describe('alarmGrouping', () => {
  it('groups multiple medications at the same minute into one slot alarm', () => {
    const { groupToSlotAlarms, slotAlarmId } = require('../src/features/reminders/alarmGrouping');
    const at = '2026-09-08T15:00:00';

    const slots = groupToSlotAlarms([
      {
        id: 'sched-1:2026-09-08-15-00',
        medicationId: 'med-1',
        medicationName: 'A',
        scheduledAt: at,
        doseAmount: 1,
      },
      {
        id: 'sched-2:2026-09-08-15-00',
        medicationId: 'med-2',
        medicationName: 'B',
        scheduledAt: at,
        doseAmount: 1,
      },
    ]);

    expect(slots).toHaveLength(1);
    expect(slots[0].id).toBe(slotAlarmId(at));
    expect(slots[0].scheduledAt).toBe(at);
    expect(slots[0].medicationId).toBe('med-1');
  });
});

describe('reminderService', () => {
  it('dedupes alarms for the same medication minute slot', () => {
    const { dedupeAlarms } = require('../src/features/reminders/alarmGrouping');
    const deduped = dedupeAlarms([
      {
        id: 'dose:1',
        medicationId: 'med-1',
        medicationName: 'A',
        scheduledAt: '2026-09-08T15:00:00',
        doseAmount: 1,
        doseEventId: 'dose-1',
      },
      {
        id: 'dose:2',
        medicationId: 'med-1',
        medicationName: 'A',
        scheduledAt: '2026-09-08T15:00:00',
        doseAmount: 1,
        doseEventId: 'dose-2',
      },
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('dose:1');
  });
});

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('expo-linking', () => ({
  parse: (url: string) => {
    const query = url.split('?')[1] ?? '';
    const queryParams: Record<string, string> = {};
    for (const part of query.split('&')) {
      const [key, value] = part.split('=');
      if (key) queryParams[key] = decodeURIComponent(value ?? '');
    }
    return { queryParams };
  },
}));

describe('reminderQueue', () => {
  beforeEach(() => {
    const { resetReminderQueueForTests, setReminderRouterReady } =
      require('../src/features/reminders/reminderQueue');
    const { resetReminderRouterReadyForTests } =
      require('../src/features/reminders/reminderRouterReady');
    resetReminderQueueForTests();
    resetReminderRouterReadyForTests();
    setReminderRouterReady(true);
  });

  it('queues a second reminder while one is active', async () => {
    const { pushReminder, completeCurrentReminder } = require('../src/features/reminders/reminderQueue');
    const { resetReminderNavigationForTests } =
      require('../src/features/reminders/reminderNavigationDedupe');

    resetReminderNavigationForTests();

    const first = {
      medicationId: 'med-1',
      alarmId: 'alarm-1',
      scheduledAt: '2026-09-08T08:00:00',
    };
    const second = {
      medicationId: 'med-2',
      alarmId: 'alarm-2',
      scheduledAt: '2026-09-08T08:00:00',
    };

    expect(pushReminder(first)).toBe(true);
    expect(pushReminder(second)).toBe(false);
    await expect(completeCurrentReminder()).resolves.toBe(true);
  });

  it('does not re-show a reminder that was already handled', () => {
    const { pushReminder, markReminderHandled } = require('../src/features/reminders/reminderQueue');
    const { resetReminderNavigationForTests } =
      require('../src/features/reminders/reminderNavigationDedupe');

    resetReminderNavigationForTests();

    const whey = {
      medicationId: 'med-whey',
      alarmId: 'alarm-whey',
      scheduledAt: '2026-09-08T08:00:00',
    };
    const creatine = {
      medicationId: 'med-creatine',
      alarmId: 'alarm-creatine',
      scheduledAt: '2026-09-08T08:00:00',
    };

    expect(pushReminder(whey)).toBe(true);
    markReminderHandled(whey);
    expect(pushReminder(whey)).toBe(false);
    expect(pushReminder(creatine)).toBe(false);
  });
});

describe('reminderNavigationDedupe', () => {
  beforeEach(() => {
    const { resetReminderNavigationForTests } = require('../src/features/reminders/reminderNavigationDedupe');
    resetReminderNavigationForTests();
  });

  it('dedupes repeated navigation to the same reminder', () => {
    const {
      shouldNavigateToReminder,
      reminderNavigationKey,
    } = require('../src/features/reminders/reminderNavigationDedupe');
    const params = {
      medicationId: 'med-1',
      alarmId: 'alarm-1',
      scheduledAt: '2026-09-08T15:00:00',
    };

    expect(reminderNavigationKey(params)).toBe('alarm-1|med-1|2026-09-08T15:00:00|');
    expect(shouldNavigateToReminder(params, 1000)).toBe(true);
    expect(shouldNavigateToReminder(params, 2000)).toBe(false);
    expect(shouldNavigateToReminder(params, 10_000)).toBe(true);
  });
});

describe('permissionHelper', () => {
  beforeEach(() => resetPermissionCacheForTests());

  it('reports native alarm module as linked when MedicationAlarm exists', () => {
    expect(typeof permissionHelper.isNativeAlarmModuleLinked()).toBe('boolean');
  });
});

describe('wizardStore', () => {
  it('requires medication type to proceed configure', () => {
    const { useWizardStore } = require('../src/features/medications/wizardStore');
    useWizardStore.getState().reset();
    expect(useWizardStore.getState().canProceedConfigure()).toBe(false);
    useWizardStore.getState().setMedicationType('tablet');
    expect(useWizardStore.getState().canProceedConfigure()).toBe(true);
  });

  it('selects powder shape and gram unit for powder supplements', () => {
    const { useWizardStore } = require('../src/features/medications/wizardStore');
    const { getMedicationTypeLabel } = require('../src/core/types/domain');
    useWizardStore.getState().reset();
    useWizardStore.getState().setMedicationType('powder');
    const { draft } = useWizardStore.getState();
    expect(getMedicationTypeLabel('powder')).toBe('Powder');
    expect(draft.pillShape).toBe('powder');
    expect(draft.strengthUnit).toBe('g');
  });

  it('keeps in-memory schedule edits while editing the same medication', () => {
    const { useWizardStore } = require('../src/features/medications/wizardStore');
    useWizardStore.getState().reset();
    useWizardStore.getState().loadDraftForEdit(
      {
        name: 'Whey',
        medicationType: 'powder',
        timesPerDay: 1,
        timesOfDay: [{ hour: 15, minute: 30, doseAmount: 1 }],
        timesCountSet: true,
        frequency: 'fixed_daily',
        startDate: '2026-09-08',
        currentQuantity: 10,
        refillEnabled: false,
      },
      'med-1',
    );
    useWizardStore.getState().setTimeAtIndex(0, { hour: 16, minute: 0, doseAmount: 1 });
    expect(useWizardStore.getState().draft.timesOfDay[0]).toEqual({
      hour: 16,
      minute: 0,
      doseAmount: 1,
    });
    expect(useWizardStore.getState().editingMedicationId).toBe('med-1');
  });
});

describe('formatDoseLabel', () => {
  const { formatDoseLabel, formatTakeDoseInstruction } = require('../src/core/types/domain');

  it('labels solid oral forms by count', () => {
    expect(formatDoseLabel(1, 'tablet')).toBe('1 tablet');
    expect(formatDoseLabel(2, 'tablet')).toBe('2 tablets');
    expect(formatDoseLabel(1, 'capsule')).toBe('1 capsule');
    expect(formatDoseLabel(2, 'softgel_capsule')).toBe('2 capsules');
  });

  it('labels powder and liquid as direct grams or ml', () => {
    expect(formatDoseLabel(35, 'powder')).toBe('35 g');
    expect(formatDoseLabel(17.5, 'powder', { doseUnitValue: 35, strengthValue: 25, strengthUnit: 'g' })).toBe(
      '17.5 g',
    );
    expect(formatDoseLabel(10, 'liquid', { strengthValue: 5, strengthUnit: 'ml' })).toBe('10 ml');
    expect(formatDoseLabel(2.5, 'liquid')).toBe('2.5 ml');
  });

  it('labels inhaler doses as pumps', () => {
    expect(formatDoseLabel(1, 'inhaler')).toBe('1 pump');
    expect(formatDoseLabel(2, 'inhaler')).toBe('2 pumps');
  });

  it('labels drops and fallbacks without strength', () => {
    expect(formatDoseLabel(2, 'drops')).toBe('2 drops');
    expect(formatDoseLabel(1, 'powder')).toBe('1 g');
    expect(formatDoseLabel(1, 'liquid')).toBe('1 ml');
  });

  it('builds take instructions for reminders', () => {
    expect(formatTakeDoseInstruction(1, 'tablet')).toBe('Take 1 tablet');
    expect(formatTakeDoseInstruction(35, 'powder')).toBe('Take 35 g');
    expect(formatTakeDoseInstruction(10, 'liquid')).toBe('Take 10 ml');
    expect(formatTakeDoseInstruction(2, 'inhaler')).toBe('Take 2 pumps');
  });
});

describe('getInventoryQuantityPrompt', () => {
  const { getInventoryQuantityPrompt } = require('../src/core/types/domain');

  it('uses form-specific stock labels on the review screen', () => {
    expect(getInventoryQuantityPrompt('powder')).toBe('Number of remaining scoops');
    expect(getInventoryQuantityPrompt('liquid')).toBe('Number of remaining doses');
    expect(getInventoryQuantityPrompt('inhaler')).toBe('Number of remaining uses');
    expect(getInventoryQuantityPrompt('tablet')).toBe('Number of remaining tablets');
  });
});

describe('inventoryDeductAmount', () => {
  const { inventoryDeductAmount } = require('../src/core/types/domain');

  it('deducts one serving for powder and liquid regardless of gram/ml dose', () => {
    expect(inventoryDeductAmount(35, 'powder')).toBe(1);
    expect(inventoryDeductAmount(17.5, 'powder')).toBe(1);
    expect(inventoryDeductAmount(10, 'liquid')).toBe(1);
  });

  it('deducts dose count for solid forms', () => {
    expect(inventoryDeductAmount(1, 'tablet')).toBe(1);
    expect(inventoryDeductAmount(2, 'capsule')).toBe(2);
    expect(inventoryDeductAmount(1.5, 'tablet')).toBe(2);
  });
});

describe('getDefaultDoseAmount', () => {
  const { getDefaultDoseAmount } = require('../src/core/types/domain');

  it('prefers scoop size for powder and strength for liquid', () => {
    expect(getDefaultDoseAmount('powder', { doseUnitValue: 35, strengthValue: 25 })).toBe(35);
    expect(getDefaultDoseAmount('powder', { strengthValue: 25 })).toBe(1);
    expect(getDefaultDoseAmount('liquid', { strengthValue: 5 })).toBe(5);
    expect(getDefaultDoseAmount('tablet')).toBe(1);
  });
});

describe('formatStrengthSubtitle', () => {
  const { formatStrengthSubtitle } = require('../src/core/types/domain');

  it('shows scoop size and strength separately for powder', () => {
    expect(formatStrengthSubtitle('powder', 25, 'g', 35, 'g')).toBe(
      'Powder, 35 g per scoop, 25 g strength',
    );
    expect(formatStrengthSubtitle('powder', 5, 'g')).toBe('Powder, 5 g strength');
    expect(formatStrengthSubtitle('powder', undefined, undefined, 10, 'g')).toBe(
      'Powder, 10 g per scoop',
    );
  });
});

describe('doseSlotUtils', () => {
  it('treats UTC and local storage as the same slot', () => {
    const { doseSlotKey, dedupeDoseEvents } = require('../src/features/medications/doseSlotUtils');

    const utcDose = {
      id: 'dose-utc',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      scheduledAt: '2026-09-08T08:22:00.000Z',
      status: 'pending',
      createdAt: '2026-09-08T10:00:00Z',
    };
    const localDose = {
      id: 'dose-local',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      scheduledAt: '2026-09-08T13:52:00',
      status: 'pending',
      createdAt: '2026-09-08T11:00:00Z',
    };

    expect(doseSlotKey(utcDose)).toBe(doseSlotKey(localDose));
    expect(dedupeDoseEvents([utcDose, localDose])).toHaveLength(1);
    expect(dedupeDoseEvents([utcDose, localDose])[0].id).toBe('dose-local');
  });

  it('dedupes skipped and pending doses for the same medication slot', () => {
    const { dedupeDoseEvents } = require('../src/features/medications/doseSlotUtils');

    const skipped = {
      id: 'skipped',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      scheduledAt: '2026-09-08T08:00:00',
      status: 'skipped',
      notes: null,
      doseAmount: 1,
      createdAt: '2026-09-08',
      updatedAt: '2026-09-08',
    };
    const pending = {
      id: 'pending',
      medicationId: 'med-1',
      scheduleId: null,
      scheduledAt: '2026-09-08T08:00:00',
      status: 'pending',
      notes: null,
      doseAmount: 1,
      createdAt: '2026-09-08',
      updatedAt: '2026-09-08',
    };

    const visible = dedupeDoseEvents([skipped, pending]);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('skipped');
  });

  it('dedupes pending when skipped dose kept snooze notes on the original slot', () => {
    const {
      dedupeDoseEvents,
      filterPendingDuplicatingResolved,
      buildSnoozedFromNotes,
    } = require('../src/features/medications/doseSlotUtils');

    const skippedAfterSnooze = {
      id: 'skipped',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      scheduledAt: '2026-09-08T10:00:00',
      status: 'skipped',
      notes: buildSnoozedFromNotes('2026-09-08T08:00:00'),
      doseAmount: 1,
      createdAt: '2026-09-08',
      updatedAt: '2026-09-08',
    };
    const pending = {
      id: 'pending',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      scheduledAt: '2026-09-08T08:00:00',
      status: 'pending',
      notes: null,
      doseAmount: 1,
      createdAt: '2026-09-08',
      updatedAt: '2026-09-08',
    };

    expect(dedupeDoseEvents([skippedAfterSnooze, pending])).toHaveLength(1);
    expect(
      filterPendingDuplicatingResolved([skippedAfterSnooze, pending]).map((d: { id: string }) => d.id),
    ).toEqual(['skipped']);
  });

  it('treats skipped dose as occupying the schedule slot', () => {
    const { DoseEventRepository } = require('../src/features/medications/medicationRepository');
    const mockDb = {
      getAllSync: jest.fn(() => [
        {
          scheduled_at: '2026-09-08T08:00:00',
          status: 'skipped',
          notes: null,
        },
      ]),
    };
    const repo = new DoseEventRepository(mockDb);
    expect(repo.existsForScheduleAt('sched-1', '2026-09-08T08:00:00')).toBe(true);
    expect(repo.existsForMedicationAt('med-1', '2026-09-08T08:00:00')).toBe(true);
  });

  it('removes pending doses that duplicate a skipped dose', () => {
    const deleted: string[] = [];
    const mockDb = {
      getAllSync: jest.fn(() => [
        {
          id: 'skipped',
          medication_id: 'med-1',
          schedule_id: 'sched-1',
          scheduled_at: '2026-09-08T08:00:00',
          status: 'skipped',
          notes: null,
          dose_amount: 1,
          created_at: '2026-09-08',
          updated_at: '2026-09-08',
        },
        {
          id: 'pending',
          medication_id: 'med-1',
          schedule_id: 'sched-1',
          scheduled_at: '2026-09-08T08:00:00',
          status: 'pending',
          notes: null,
          dose_amount: 1,
          created_at: '2026-09-08',
          updated_at: '2026-09-08',
        },
      ]),
      runSync: jest.fn(),
    };
    jest.spyOn(require('../src/features/medications/medicationRepository').DoseEventRepository.prototype, 'delete').mockImplementation((id) => {
      deleted.push(String(id));
    });

    const { removePendingDuplicatingResolvedDoses } = require('../src/features/medications/doseGenerationService');
    expect(removePendingDuplicatingResolvedDoses(mockDb)).toBe(1);
    expect(deleted).toEqual(['pending']);
  });

  it('hides pending dose when same slot was snoozed', () => {
    const { filterPendingReplacedBySnooze, buildSnoozedFromNotes } = require('../src/features/medications/doseSlotUtils');

    const snoozed = {
      id: 'snoozed',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      scheduledAt: '2026-09-08T15:00:00',
      status: 'snoozed',
      notes: buildSnoozedFromNotes('2026-09-08T13:52:00'),
      doseAmount: 1,
      createdAt: '2026-09-08',
      updatedAt: '2026-09-08',
    };
    const pending = {
      id: 'pending',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      scheduledAt: '2026-09-08T13:52:00',
      status: 'pending',
      notes: null,
      doseAmount: 1,
      createdAt: '2026-09-08',
      updatedAt: '2026-09-08',
    };

    const visible = filterPendingReplacedBySnooze([snoozed, pending]);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('snoozed');
  });

  it('keeps snoozed doses visible on their original day', () => {
    const { doseBelongsToDateKey, buildSnoozedFromNotes } = require('../src/features/medications/doseSlotUtils');

    const snoozed = {
      scheduledAt: '2026-09-09T09:00:00',
      status: 'snoozed',
      notes: buildSnoozedFromNotes('2026-09-08T13:52:00'),
    };

    expect(doseBelongsToDateKey(snoozed, '2026-09-08')).toBe(true);
    expect(doseBelongsToDateKey(snoozed, '2026-09-09')).toBe(true);
    expect(doseBelongsToDateKey(snoozed, '2026-09-07')).toBe(false);
  });

  it('cleans pending doses when a once-daily schedule was snoozed', () => {
    const deleted: string[] = [];
    const mockDb = {
      getAllSync: jest.fn(() => [
        {
          id: 'snoozed',
          medication_id: 'med-1',
          schedule_id: 'sched-1',
          scheduled_at: '2026-09-08T15:00:00',
          status: 'snoozed',
          notes: 'snoozedFrom:2026-09-08T13:52:00',
          dose_amount: 1,
          created_at: '2026-09-08',
          updated_at: '2026-09-08',
        },
        {
          id: 'pending',
          medication_id: 'med-1',
          schedule_id: 'sched-1',
          scheduled_at: '2026-09-08T13:52:00',
          status: 'pending',
          notes: null,
          dose_amount: 1,
          created_at: '2026-09-08',
          updated_at: '2026-09-08',
        },
      ]),
      runSync: jest.fn(),
      getFirstSync: jest.fn(),
    };

    const { MedicationRepository } = require('../src/features/medications/medicationRepository');
    jest.spyOn(MedicationRepository.prototype, 'getAll').mockReturnValue([{ id: 'med-1' }]);
    jest.spyOn(MedicationRepository.prototype, 'getActiveSchedules').mockReturnValue([
      {
        id: 'sched-1',
        medicationId: 'med-1',
        type: 'fixed_daily',
        timesOfDay: JSON.stringify([{ hour: 13, minute: 52, doseAmount: 1 }]),
        startDate: '2026-09-08',
        isActive: true,
      },
    ]);
    jest.spyOn(MedicationRepository.prototype, 'getSchedule').mockReturnValue({
      id: 'sched-1',
      timesOfDay: JSON.stringify([{ hour: 13, minute: 52, doseAmount: 1 }]),
    });

    const { DoseEventRepository } = require('../src/features/medications/medicationRepository');
    jest.spyOn(DoseEventRepository.prototype, 'delete').mockImplementation((id: unknown) => {
      deleted.push(String(id));
    });
    jest.spyOn(DoseEventRepository.prototype, 'backfillSnoozeNotes').mockImplementation(() => undefined);

    const { cleanupSnoozeConflicts } = require('../src/features/medications/snoozeCleanupService');
    cleanupSnoozeConflicts(mockDb);

    expect(deleted).toContain('pending');
  });
});

describe('doseGenerationService', () => {
  it('removes pending doses that no longer match the schedule', () => {
    const deletedIds: string[] = [];
    const pendingDoses = [
      {
        id: 'old-dose',
        medicationId: 'med-1',
        scheduleId: 'sched-1',
        scheduledAt: '2026-09-08T08:00:00',
        status: 'pending',
        doseAmount: 1,
        createdAt: '2026-09-08',
        updatedAt: '2026-09-08',
      },
    ];

    const { DoseEventRepository } = require('../src/features/medications/medicationRepository');
    const doseRepo = new DoseEventRepository({} as never);
    jest.spyOn(doseRepo, 'getPendingForSchedule').mockReturnValue(pendingDoses);
    jest.spyOn(doseRepo, 'delete').mockImplementation((id: unknown) => {
      deletedIds.push(String(id));
    });

    const { pruneStalePendingDoses } = require('../src/features/medications/doseGenerationService');
    const { expandOccurrences } = require('../src/features/reminders/occurrenceExpander');
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      type: 'fixed_daily',
      timesOfDay: JSON.stringify([{ hour: 14, minute: 0, doseAmount: 1 }]),
      startDate: '2026-09-08',
      isActive: true,
      createdAt: '2026-09-08',
    };
    const occurrences = expandOccurrences(
      schedule,
      new Date('2026-09-08T00:00:00'),
      new Date('2026-09-08T23:59:59'),
    );

    pruneStalePendingDoses(doseRepo, 'sched-1', occurrences);
    expect(deletedIds).toEqual(['old-dose']);
  });

  it('clears future pending doses when a schedule is edited', () => {
    const deleted: string[] = [];
    const pending = {
      id: 'future-pending',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      scheduledAt: '2026-12-08T15:30:00',
      status: 'pending',
      doseAmount: 1,
      createdAt: '2026-09-08',
      updatedAt: '2026-09-08',
    };

    const { DoseEventRepository } = require('../src/features/medications/medicationRepository');
    const doseRepo = new DoseEventRepository({} as never);
    jest.spyOn(doseRepo, 'getPendingForSchedule').mockReturnValue([pending]);
    jest.spyOn(doseRepo, 'getSnoozedForSchedule').mockReturnValue([]);
    jest.spyOn(doseRepo, 'delete').mockImplementation((id: unknown) => {
      deleted.push(String(id));
    });

    const { resyncPendingDosesAfterScheduleUpdate } = require('../src/features/medications/doseGenerationService');
    const original = DoseEventRepository.prototype.getPendingForSchedule;
    const originalSnoozed = DoseEventRepository.prototype.getSnoozedForSchedule;
    const originalDelete = DoseEventRepository.prototype.delete;
    DoseEventRepository.prototype.getPendingForSchedule = doseRepo.getPendingForSchedule;
    DoseEventRepository.prototype.getSnoozedForSchedule = doseRepo.getSnoozedForSchedule;
    DoseEventRepository.prototype.delete = doseRepo.delete;

    expect(resyncPendingDosesAfterScheduleUpdate({} as never, 'sched-1')).toBe(1);
    expect(deleted).toEqual(['future-pending']);

    DoseEventRepository.prototype.getPendingForSchedule = original;
    DoseEventRepository.prototype.getSnoozedForSchedule = originalSnoozed;
    DoseEventRepository.prototype.delete = originalDelete;
  });

  it('does not duplicate dose events for same schedule slot', () => {
    const runs: unknown[][] = [];
    const mockDb = {
      runSync: jest.fn((sql: string, params?: unknown[]) => {
        runs.push(params ?? []);
      }),
      getFirstSync: jest.fn((sql: string) => {
        if (sql.includes('medications')) {
          return { id: 'med-1', name: 'Test' };
        }
        if (sql.includes('schedules') && sql.includes('is_active')) {
          return {
            id: 'sched-1',
            medicationId: 'med-1',
            type: 'fixed_daily',
            timesOfDay: JSON.stringify([{ hour: 8, minute: 0 }]),
            startDate: '2026-01-01',
            isActive: true,
          };
        }
        if (sql.includes('existsForScheduleAt') || sql.includes('schedule_id')) {
          return null;
        }
        return null;
      }),
      getAllSync: jest.fn((sql: string) => {
        if (sql.includes('FROM medications')) return [{ id: 'med-1', name: 'Test' }];
        if (sql.includes('FROM schedules')) {
          return [
            {
              id: 'sched-1',
              medicationId: 'med-1',
              type: 'fixed_daily',
              timesOfDay: JSON.stringify([{ hour: 8, minute: 0 }]),
              intervalDays: null,
              weekdayMask: null,
              dayOfMonth: null,
              startDate: '2026-01-01',
              endDate: null,
              isActive: true,
              createdAt: '2026-01-01',
            },
          ];
        }
        return [];
      }),
    };

    const { generateUpcomingDoseEvents } = require('../src/features/medications/doseGenerationService');
    const { MedicationRepository, DoseEventRepository } = require('../src/features/medications/medicationRepository');

    jest.spyOn(MedicationRepository.prototype, 'getAll').mockReturnValue([{ id: 'med-1' }]);
    jest.spyOn(MedicationRepository.prototype, 'getActiveSchedules').mockReturnValue([
      {
        id: 'sched-1',
        medicationId: 'med-1',
        type: 'fixed_daily',
        timesOfDay: JSON.stringify([{ hour: 8, minute: 0 }]),
        startDate: '2026-01-01',
        isActive: true,
      },
    ]);
    const existsSpy = jest.spyOn(DoseEventRepository.prototype, 'existsForScheduleAt').mockReturnValue(false);
    const createSpy = jest
      .spyOn(DoseEventRepository.prototype, 'createPending')
      .mockReturnValue({ id: 'dose-1', status: 'pending' } as never);

    const created = generateUpcomingDoseEvents(mockDb, 7);
    expect(created).toBeGreaterThan(0);

    existsSpy.mockReturnValue(true);
    const createdAgain = generateUpcomingDoseEvents(mockDb, 7);
    expect(createdAgain).toBe(0);
    expect(createSpy).toHaveBeenCalledTimes(created);
  });
});

describe('rowMappers', () => {
  it('maps snake_case schedule rows for dose expansion', () => {
    const { mapScheduleRow } = require('../src/db/rowMappers');
    const schedule = mapScheduleRow({
      id: 'sched-1',
      medication_id: 'med-1',
      type: 'fixed_daily',
      times_of_day: JSON.stringify([{ hour: 11, minute: 0, doseAmount: 1 }]),
      start_date: '2026-09-08',
      is_active: 1,
      created_at: '2026-09-08',
    });

    const occurrences = expandOccurrences(
      schedule,
      new Date('2026-09-08T00:00:00'),
      new Date('2026-09-08T23:59:59'),
    );
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].scheduledAt).toBe('2026-09-08T11:00:00');
    expect(parseScheduledAt(occurrences[0].scheduledAt).getHours()).toBe(11);
  });
});

describe('default variant invariant', () => {
  it('creates exactly one default variant on medication insert', () => {
    const mockDb = {
      runSync: jest.fn(),
      getFirstSync: jest.fn()
        .mockReturnValueOnce({
          id: 'med-1',
          name: 'Test Med',
          medication_type: 'tablet',
          current_quantity: 10,
          refill_enabled: 0,
          created_at: '2026-09-08',
          updated_at: '2026-09-08',
        })
        .mockReturnValueOnce({
          id: 'var-1',
          medication_id: 'med-1',
          label: 'Test Med',
          is_default: 1,
          current_quantity: 10,
          created_at: '2026-09-08',
        })
        .mockReturnValueOnce({
          id: 'sched-1',
          medication_id: 'med-1',
          type: 'fixed_daily',
          times_of_day: JSON.stringify([{ hour: 8, minute: 0 }]),
          start_date: '2026-09-08',
          is_active: 1,
          created_at: '2026-09-08',
        }),
      getAllSync: jest.fn(() => []),
    };

    const { MedicationRepository } = require('../src/features/medications/medicationRepository');
    const repo = new MedicationRepository(mockDb);
    repo.create({
      name: 'Test Med',
      medicationType: 'tablet',
      currentQuantity: 10,
      schedule: {
        type: 'fixed_daily',
        timesOfDay: [{ hour: 8, minute: 0 }],
        startDate: '2026-09-08',
      },
    });

    const variantInserts = mockDb.runSync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('medication_variants'),
    );
    expect(variantInserts).toHaveLength(1);
    expect(variantInserts[0][0]).toContain('is_default');
  });

  it('deletes dose events and related rows when medication is removed', () => {
    const mockDb = {
      runSync: jest.fn(),
      getFirstSync: jest.fn().mockReturnValue({
        id: 'med-1',
        name: 'Test Med',
        medication_type: 'tablet',
        current_quantity: 10,
        refill_enabled: 0,
        created_at: '2026-09-08',
        updated_at: '2026-09-08',
      }),
      getAllSync: jest.fn(() => []),
    };

    const { MedicationRepository } = require('../src/features/medications/medicationRepository');
    const repo = new MedicationRepository(mockDb);
    const deleted = repo.delete('med-1');

    expect(deleted).toBe(true);
    const deleteCalls = mockDb.runSync.mock.calls.map((call: unknown[]) => call[0]);
    expect(deleteCalls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('DELETE FROM dose_events'),
        expect.stringContaining('DELETE FROM inventory_transactions'),
        expect.stringContaining('DELETE FROM schedules'),
        expect.stringContaining('DELETE FROM medication_variants'),
        expect.stringContaining('DELETE FROM medications'),
      ]),
    );
  });
});

describe('InventoryService', () => {
  it('decrements medication and variant stock when a dose is taken', () => {
    const state = {
      dose: {
        id: 'dose-1',
        medication_id: 'med-1',
        dose_amount: 1,
        status: 'pending',
        variant_id: null,
      },
      med: {
        id: 'med-1',
        current_quantity: 10,
      },
      variant: {
        id: 'var-1',
        medication_id: 'med-1',
        current_quantity: 10,
        is_default: 1,
      },
      transactions: [] as Array<Record<string, unknown>>,
    };

    const mockDb = {
      execSync: jest.fn(),
      runSync: jest.fn((sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE medications SET current_quantity')) {
          state.med.current_quantity = params?.[0] as number;
        }
        if (sql.includes('UPDATE medication_variants SET current_quantity')) {
          state.variant.current_quantity = params?.[0] as number;
        }
        if (sql.includes('INSERT INTO inventory_transactions')) {
          state.transactions.push({
            dose_event_id: params?.[6],
            type: params?.[3],
            quantity_delta: params?.[4],
          });
        }
      }),
      getFirstSync: jest.fn((sql: string) => {
        if (sql.includes('inventory_transactions') && sql.includes('dose_taken')) {
          return null;
        }
        if (sql.includes('FROM dose_events')) {
          return state.dose;
        }
        if (sql.includes('FROM medications')) {
          return state.med;
        }
        if (sql.includes('medication_variants') && sql.includes('is_default')) {
          return state.variant;
        }
        return null;
      }),
      getAllSync: jest.fn((sql: string, params?: unknown[]) => {
        if (sql.includes('medication_variants') && params?.[0] === 'med-1') {
          return [state.variant];
        }
        return [];
      }),
    };

    const { InventoryService } = require('../src/features/inventory/inventoryService');
    const { MedicationRepository, DoseEventRepository } = require('../src/features/medications/medicationRepository');

    jest.spyOn(DoseEventRepository.prototype, 'getById').mockImplementation((id: unknown) => {
      if (id !== 'dose-1') return null;
      return {
        id: 'dose-1',
        medicationId: 'med-1',
        doseAmount: 1,
        status: 'pending',
        variantId: null,
      };
    });
    jest.spyOn(MedicationRepository.prototype, 'getById').mockImplementation((id: unknown) => {
      if (id !== 'med-1') return null;
      return { id: 'med-1', currentQuantity: state.med.current_quantity, medicationType: 'tablet' };
    });
    jest.spyOn(MedicationRepository.prototype, 'getDefaultVariant').mockReturnValue({
      id: 'var-1',
      medicationId: 'med-1',
      currentQuantity: state.variant.current_quantity,
      isDefault: true,
    });
    jest.spyOn(MedicationRepository.prototype, 'getVariants').mockReturnValue([
      {
        id: 'var-1',
        medicationId: 'med-1',
        currentQuantity: state.variant.current_quantity,
        isDefault: true,
      },
    ]);
    jest.spyOn(MedicationRepository.prototype, 'recordInventoryTransaction').mockImplementation(() => {});

    const inventory = new InventoryService(
      mockDb,
      new MedicationRepository(mockDb),
      new DoseEventRepository(mockDb),
    );

    const result = inventory.decrementOnTaken('dose-1');
    expect(result.newQty).toBe(9);
    expect(result.changed).toBe(true);
    expect(state.med.current_quantity).toBe(9);
    expect(state.variant.current_quantity).toBe(9);
  });

  it('decrements powder and liquid stock by one serving, not gram/ml dose', () => {
    const state = {
      dose: {
        id: 'dose-powder',
        medication_id: 'med-powder',
        dose_amount: 35,
        status: 'pending',
        variant_id: null,
      },
      med: {
        id: 'med-powder',
        current_quantity: 20,
      },
      variant: {
        id: 'var-powder',
        medication_id: 'med-powder',
        current_quantity: 20,
        is_default: 1,
      },
    };

    const mockDb = {
      execSync: jest.fn(),
      runSync: jest.fn((sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE medications SET current_quantity')) {
          state.med.current_quantity = params?.[0] as number;
        }
        if (sql.includes('UPDATE medication_variants SET current_quantity')) {
          state.variant.current_quantity = params?.[0] as number;
        }
      }),
      getFirstSync: jest.fn((sql: string) => {
        if (sql.includes('inventory_transactions') && sql.includes('dose_taken')) {
          return null;
        }
        if (sql.includes('FROM dose_events')) {
          return state.dose;
        }
        if (sql.includes('FROM medications')) {
          return state.med;
        }
        if (sql.includes('medication_variants') && sql.includes('is_default')) {
          return state.variant;
        }
        return null;
      }),
      getAllSync: jest.fn((sql: string, params?: unknown[]) => {
        if (sql.includes('medication_variants') && params?.[0] === 'med-powder') {
          return [state.variant];
        }
        return [];
      }),
    };

    const { InventoryService } = require('../src/features/inventory/inventoryService');
    const { MedicationRepository, DoseEventRepository } = require('../src/features/medications/medicationRepository');

    jest.spyOn(DoseEventRepository.prototype, 'getById').mockImplementation((id: unknown) => {
      if (id !== 'dose-powder') return null;
      return {
        id: 'dose-powder',
        medicationId: 'med-powder',
        doseAmount: 35,
        status: 'pending',
        variantId: null,
      };
    });
    jest.spyOn(MedicationRepository.prototype, 'getById').mockImplementation((id: unknown) => {
      if (id !== 'med-powder') return null;
      return {
        id: 'med-powder',
        currentQuantity: state.med.current_quantity,
        medicationType: 'powder',
      };
    });
    jest.spyOn(MedicationRepository.prototype, 'getDefaultVariant').mockReturnValue({
      id: 'var-powder',
      medicationId: 'med-powder',
      currentQuantity: state.variant.current_quantity,
      isDefault: true,
    });
    jest.spyOn(MedicationRepository.prototype, 'getVariants').mockReturnValue([
      {
        id: 'var-powder',
        medicationId: 'med-powder',
        currentQuantity: state.variant.current_quantity,
        isDefault: true,
      },
    ]);
    jest.spyOn(MedicationRepository.prototype, 'recordInventoryTransaction').mockImplementation(() => {});

    const inventory = new InventoryService(
      mockDb,
      new MedicationRepository(mockDb),
      new DoseEventRepository(mockDb),
    );

    const result = inventory.decrementOnTaken('dose-powder');
    expect(result.newQty).toBe(19);
    expect(state.med.current_quantity).toBe(19);
    expect(state.variant.current_quantity).toBe(19);
  });

  it('does not double-decrement when taken is recorded twice', () => {
    const { InventoryService } = require('../src/features/inventory/inventoryService');
    const { MedicationRepository, DoseEventRepository } = require('../src/features/medications/medicationRepository');

    const mockDb = {
      runSync: jest.fn(),
      getFirstSync: jest.fn((sql: string) => {
        if (sql.includes('inventory_transactions') && sql.includes('dose_taken')) {
          return { id: 'txn-1' };
        }
        return null;
      }),
      getAllSync: jest.fn(() => []),
    };

    jest.spyOn(DoseEventRepository.prototype, 'getById').mockReturnValue({
      id: 'dose-1',
      medicationId: 'med-1',
      doseAmount: 1,
      status: 'taken',
      variantId: null,
    });
    jest.spyOn(MedicationRepository.prototype, 'getById').mockReturnValue({
      id: 'med-1',
      currentQuantity: 9,
    });

    const inventory = new InventoryService(
      mockDb,
      new MedicationRepository(mockDb),
      new DoseEventRepository(mockDb),
    );

    const result = inventory.decrementOnTaken('dose-1');
    expect(result.newQty).toBe(9);
    expect(result.changed).toBe(false);
    expect(mockDb.runSync).not.toHaveBeenCalled();
  });

  it('adds purchased quantity on refill', () => {
    const state = {
      med: { id: 'med-1', current_quantity: 10 },
      variant: { id: 'var-1', medication_id: 'med-1', current_quantity: 10, is_default: 1 },
    };

    const mockDb = {
      execSync: jest.fn(),
      runSync: jest.fn((sql: string, params?: unknown[]) => {
        if (sql.includes('UPDATE medications SET current_quantity')) {
          state.med.current_quantity = params?.[0] as number;
        }
        if (sql.includes('UPDATE medication_variants SET current_quantity')) {
          state.variant.current_quantity = params?.[0] as number;
        }
      }),
      getFirstSync: jest.fn((sql: string) => {
        if (sql.includes('FROM medications')) return state.med;
        if (sql.includes('is_default')) return state.variant;
        return null;
      }),
      getAllSync: jest.fn(() => [state.variant]),
    };

    const { InventoryService } = require('../src/features/inventory/inventoryService');
    const { MedicationRepository, DoseEventRepository } = require('../src/features/medications/medicationRepository');

    jest.spyOn(MedicationRepository.prototype, 'getById').mockReturnValue({
      id: 'med-1',
      currentQuantity: state.med.current_quantity,
    });
    jest.spyOn(MedicationRepository.prototype, 'getDefaultVariant').mockReturnValue({
      id: 'var-1',
      currentQuantity: state.variant.current_quantity,
    });
    jest.spyOn(MedicationRepository.prototype, 'getVariants').mockReturnValue([
      { id: 'var-1', currentQuantity: state.variant.current_quantity },
    ]);
    jest.spyOn(MedicationRepository.prototype, 'recordInventoryTransaction').mockImplementation(() => {});

    const inventory = new InventoryService(
      mockDb,
      new MedicationRepository(mockDb),
      new DoseEventRepository(mockDb),
    );

    const remaining = inventory.addRefillQuantity('med-1', 30);
    expect(remaining).toBe(40);
    expect(state.med.current_quantity).toBe(40);
    expect(state.variant.current_quantity).toBe(40);
  });
});
