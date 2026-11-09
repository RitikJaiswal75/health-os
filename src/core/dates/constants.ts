/** A start date, and the backfill of its past doses, goes at most this many days back. */
export const MAX_START_DATE_DAYS_BACK = 15;

/** History can be browsed this many years back, with or without data (a technical bound). */
export const HISTORY_FLOOR_YEARS = 10;
/** An unlogged dose from an earlier day becomes skipped only this long after it was due, so a bedtime alarm answered after midnight can still be logged. */
export const SKIP_UNLOGGED_AFTER_HOURS = 6;
