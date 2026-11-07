import { addDays, format } from 'date-fns';
import type { DoseEvent } from '../src/db/schema';
import { filterPendingDuplicatingResolved } from '../src/features/medications/doseSlotUtils';

function dose(id: string, medicationId: string, day: Date, hour: number, status: string): DoseEvent {
  return {
    id,
    medicationId,
    scheduleId: `sched-${medicationId}`,
    scheduledAt: `${format(day, 'yyyy-MM-dd')}T${String(hour).padStart(2, '0')}:00:00`,
    status,
    notes: null,
  } as DoseEvent;
}

/** 3 medicines, twice a day: ~3 years of history plus 2 weeks pending, one pending duplicate. */
function longHistory(): DoseEvent[] {
  const doses: DoseEvent[] = [];
  const start = new Date(2023, 0, 1);
  for (const med of ['a', 'b', 'c']) {
    for (let day = 0; day < 1110; day += 1) {
      for (const hour of [8, 20]) {
        const status = day < 1095 ? 'taken' : 'pending';
        doses.push(dose(`${med}-${day}-${hour}`, med, addDays(start, day), hour, status));
      }
    }
  }
  doses.push(dose('dup', 'a', addDays(start, 10), 8, 'pending'));
  return doses;
}

describe('filterPendingDuplicatingResolved at scale', () => {
  it('hides only the pending duplicate, quickly, on years of history', () => {
    const doses = longHistory();
    const started = performance.now();
    const kept = filterPendingDuplicatingResolved(doses);
    const elapsedMs = performance.now() - started;

    expect(kept.map((d) => d.id)).not.toContain('dup');
    expect(kept).toHaveLength(doses.length - 1);
    // One pass over ~6,700 rows; the old pairwise compare took seconds.
    expect(elapsedMs).toBeLessThan(500);
  });
});
