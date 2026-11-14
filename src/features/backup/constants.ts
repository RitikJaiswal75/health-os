/** Public web OAuth client of the Firebase project (type 3 in google-services.json); not a secret. */
export const GOOGLE_WEB_CLIENT_ID =
  '782647661131-vpaqhng3qf3j8465mal4iifqvrvra5pc.apps.googleusercontent.com';
export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export const BACKUP_FILE_NAME = 'healthos-backup.zip';
export const BACKUP_STATE_FILENAME = 'backup-state.json';
export const BACKUP_TASK_NAME = 'health-os-drive-backup';
/** Bumped only when the zip layout changes; restore refuses a newer one. */
export const BACKUP_FORMAT_VERSION = 1;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const AUTO_BACKUP_INTERVAL_MS = DAY_MS;
export const STALE_BACKUP_MS = 7 * DAY_MS;
export const STALE_SNOOZE_MS = DAY_MS;
export const BACKOFF_BASE_MS = 15 * 60 * 1000;
/** Failures before a background problem is sent to crash reporting. */
export const REPORT_AFTER_FAILURES = 3;
export const BACKGROUND_TASK_INTERVAL_MINUTES = 12 * 60;

export const PHOTO_MAX_EDGE = 1024;
export const PHOTO_JPEG_QUALITY = 0.7;
export const DRIVE_TIMEOUT_MS = 60_000;
