export type ReminderRouteParams = {
  /** Omitted for grouped slot alarms — meds are loaded from SQLite by scheduledAt. */
  medicationId?: string;
  alarmId: string;
  scheduledAt?: string;
  doseEventId?: string;
};
