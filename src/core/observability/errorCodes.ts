export const ERROR_CODES = [
  'DOSE_MARK_FAILED',
  'DB_BOOTSTRAP_FAILED',
  'ALARM_SCHEDULE_FAILED',
  'CATALOG_FETCH_FAILED',
  'I18N_CATALOG_FAILED',
  'INVENTORY_LEDGER_FAILED',
  'UNHANDLED_JS_ERROR',
  'UNHANDLED_REJECTION',
  'ERROR_BOUNDARY',
  'DEBUG_TEST_CRASH',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const ERROR_CODE_SET = new Set<string>(ERROR_CODES);

export function isErrorCode(value: string): value is ErrorCode {
  return ERROR_CODE_SET.has(value);
}
