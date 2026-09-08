import { format } from 'date-fns';
import type { DoseEvent } from '../../db/schema';
import { formatLocalDateTime, formatDateKey, parseScheduledAt, scheduledAtToDateKey } from '../../core/dates/dateUtils';

const SNOOZE_NOTE_PREFIX = 'snoozedFrom:';

const STATUS_PRIORITY: Record<string, number> = {
  taken: 0,
  skipped: 1,
  missed: 2,
  snoozed: 3,
  pending: 4,
};

export function buildSnoozedFromNotes(originalScheduledAt: string): string {
  return `${SNOOZE_NOTE_PREFIX}${normalizeScheduledAtStorage(originalScheduledAt)}`;
}

export function parseSnoozedFromNotes(notes: string | null | undefined): string | null {
  if (!notes?.startsWith(SNOOZE_NOTE_PREFIX)) return null;
  const value = notes.slice(SNOOZE_NOTE_PREFIX.length);
  return value || null;
}

export function slotKeyFromScheduledAt(scheduledAt: string): string {
  return format(parseScheduledAt(scheduledAt), 'yyyy-MM-dd-HH-mm');
}

export function slotKeysEqual(a: string, b: string): boolean {
  return (
    slotKeyFromScheduledAt(normalizeScheduledAtStorage(a)) ===
    slotKeyFromScheduledAt(normalizeScheduledAtStorage(b))
  );
}

export function filterPendingReplacedBySnooze(doses: DoseEvent[]): DoseEvent[] {
  const deferredSlotKeys = new Set<string>();
  for (const dose of doses) {
    if (dose.status !== 'snoozed' || !dose.scheduleId) continue;
    const snoozedFrom = parseSnoozedFromNotes(dose.notes);
    if (snoozedFrom) {
      deferredSlotKeys.add(`${dose.scheduleId}:${slotKeyFromScheduledAt(snoozedFrom)}`);
    }
  }
  if (deferredSlotKeys.size === 0) return doses;

  return doses.filter((dose) => {
    if (dose.status !== 'pending' || !dose.scheduleId) return true;
    const key = `${dose.scheduleId}:${slotKeyFromScheduledAt(dose.scheduledAt)}`;
    return !deferredSlotKeys.has(key);
  });
}

export function effectiveScheduledAt(
  dose: Pick<DoseEvent, 'scheduledAt' | 'status' | 'notes'>,
): string {
  return parseSnoozedFromNotes(dose.notes) ?? dose.scheduledAt;
}

/** Slot identity for dedupe — medication + wall-clock time (ignores schedule row differences). */
export function doseDedupeKey(
  dose: Pick<DoseEvent, 'medicationId' | 'scheduledAt' | 'status' | 'notes'>,
): string {
  return `${dose.medicationId}:${slotKeyFromScheduledAt(normalizeScheduledAtStorage(effectiveScheduledAt(dose)))}`;
}

export function dosesShareMedicationSlot(
  a: Pick<DoseEvent, 'medicationId' | 'scheduledAt' | 'status' | 'notes'>,
  b: Pick<DoseEvent, 'medicationId' | 'scheduledAt' | 'status' | 'notes'>,
): boolean {
  return (
    a.medicationId === b.medicationId &&
    slotKeysEqual(effectiveScheduledAt(a), effectiveScheduledAt(b))
  );
}

/** Hide pending rows when the same medication slot is already taken/skipped/missed. */
export function filterPendingDuplicatingResolved(doses: DoseEvent[]): DoseEvent[] {
  const resolved = doses.filter((d) => ['taken', 'skipped', 'missed'].includes(d.status));
  if (resolved.length === 0) return doses;

  return doses.filter((dose) => {
    if (dose.status !== 'pending') return true;
    return !resolved.some((other) => dosesShareMedicationSlot(other, dose));
  });
}

export function doseSlotKey(dose: Pick<DoseEvent, 'scheduleId' | 'medicationId' | 'scheduledAt'>): string {
  const slot = slotKeyFromScheduledAt(dose.scheduledAt);
  return dose.scheduleId ? `${dose.scheduleId}:${slot}` : `${dose.medicationId}:${slot}`;
}

export function pickCanonicalDose(group: DoseEvent[]): DoseEvent {
  return [...group].sort((a, b) => {
    const statusDiff =
      (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;

    const aLocal = a.scheduledAt.endsWith('Z') ? 1 : 0;
    const bLocal = b.scheduledAt.endsWith('Z') ? 1 : 0;
    if (aLocal !== bLocal) return aLocal - bLocal;

    return a.createdAt.localeCompare(b.createdAt);
  })[0];
}

export function dedupeDoseEvents(doses: DoseEvent[]): DoseEvent[] {
  const bySlot = new Map<string, DoseEvent[]>();

  for (const dose of doses) {
    const key = doseDedupeKey(dose);
    const group = bySlot.get(key) ?? [];
    group.push(dose);
    bySlot.set(key, group);
  }

  return Array.from(bySlot.values())
    .map(pickCanonicalDose)
    .sort(
      (a, b) =>
        parseScheduledAt(a.scheduledAt).getTime() - parseScheduledAt(b.scheduledAt).getTime(),
    );
}

export function normalizeScheduledAtStorage(iso: string): string {
  if (iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso)) {
    return formatLocalDateTime(parseScheduledAt(iso));
  }
  return iso.length >= 19 ? iso.slice(0, 19) : iso;
}

export function readScheduledAtFromRow(row: unknown): string | null {
  const record = row as Record<string, string | undefined>;
  return record.scheduled_at ?? record.scheduledAt ?? null;
}

/** Which calendar day a dose belongs on for Today/history lists. */
export function doseBelongsToDateKey(
  dose: Pick<DoseEvent, 'scheduledAt' | 'status' | 'notes'>,
  dateKey: string,
): boolean {
  if (scheduledAtToDateKey(dose.scheduledAt) === dateKey) return true;

  if (dose.status === 'snoozed') {
    const snoozedFrom = parseSnoozedFromNotes(dose.notes);
    if (snoozedFrom && scheduledAtToDateKey(snoozedFrom) === dateKey) return true;
  }

  return false;
}

export function originalScheduledAt(dose: Pick<DoseEvent, 'scheduledAt' | 'notes'>): string {
  return parseSnoozedFromNotes(dose.notes) ?? dose.scheduledAt;
}
