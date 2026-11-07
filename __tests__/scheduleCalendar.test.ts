// Calendar edge cases: DST days are 23h, and short months lack the 29th–31st.
import { execFileSync } from 'child_process';
import type { Schedule } from '../src/db/types';
import { expandOccurrences } from '../src/features/reminders/occurrenceExpander';

const base = {
  id: 'sched-1',
  medicationId: 'med-1',
  timesOfDay: JSON.stringify([{ hour: 8, minute: 0, doseAmount: 1 }]),
  intervalDays: null,
  weekdayMask: null,
  dayOfMonth: null,
  endDate: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
} as const;

function days(schedule: Partial<Schedule>, from: string, to: string): string[] {
  return expandOccurrences(
    { ...base, ...schedule } as Schedule,
    new Date(`${from}T00:00:00`),
    new Date(`${to}T23:59:59`),
  ).map((o) => o.scheduledAt.slice(5, 10));
}

describe('schedule calendar edge cases', () => {
  // Jest sandboxes process.env, so TZ only takes effect in a fresh process: re-run this file in one.
  const inDstChild = process.env.TZ === 'America/New_York';

  (inDstChild ? it.skip : it)('passes in a time zone with daylight saving', () => {
    expect(() =>
      execFileSync(process.execPath, [require.resolve('jest/bin/jest'), __filename, '-t', 'DST'], {
        env: { ...process.env, TZ: 'America/New_York' },
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  (inDstChild ? it : it.skip)('every 2 days keeps its rhythm across the spring DST change', () => {
    const every2 = { type: 'interval_days', intervalDays: 2, startDate: '2026-03-01' } as const;
    expect(days(every2, '2026-03-01', '2026-03-12')).toEqual([
      '03-01', '03-03', '03-05', '03-07', '03-09', '03-11',
    ]);
  });

  it('monthly on the 31st falls on the last day of shorter months', () => {
    const monthly = { type: 'monthly', dayOfMonth: 31, startDate: '2026-01-01' } as const;
    expect(days(monthly, '2026-01-01', '2026-06-30')).toEqual([
      '01-31', '02-28', '03-31', '04-30', '05-31', '06-30',
    ]);
  });
});
