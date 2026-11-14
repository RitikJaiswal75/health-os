export type BackupState = {
  /** The user opted in; nothing here runs, and nobody is asked to sign in, before that. */
  enabled: boolean;
  lastSuccessAt: number | null;
  lastAttemptAt: number | null;
  failures: number;
  /** Sign-in expired or was revoked; background runs stop until the user signs in again. */
  needsSignIn: boolean;
  email: string | null;
  /** The first-launch "restore or start fresh" choice has been made on this install. */
  restoreDecided: boolean;
  /** The user closed the "set up backup" card. */
  optInDismissed: boolean;
  staleSnoozedUntil: number | null;
  /** When the user opted in, so "never backed up" can go stale too. */
  enabledAt: number | null;
};

export type BackupOutcome =
  | { status: 'success' }
  | { status: 'skipped'; reason: 'disabled' | 'throttled' | 'backoff' | 'needs-sign-in' | 'empty' }
  | { status: 'failed'; message: string };

export type BackupMeta = {
  formatVersion: number;
  createdAt: number;
};

export type RestoreOutcome =
  | { status: 'restored' }
  | { status: 'none' }
  | { status: 'failed'; message: string };
