import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const medications = sqliteTable('medications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nickname: text('nickname'),
  notes: text('notes'),
  medicationType: text('medication_type').notNull().default('tablet'),
  strengthValue: real('strength_value'),
  strengthUnit: text('strength_unit'),
  doseUnitValue: real('dose_unit_value'),
  doseUnitUnit: text('dose_unit_unit'),
  pillShape: text('pill_shape'),
  pillColor: text('pill_color'),
  pillColor2: text('pill_color2'),
  photoUri: text('photo_uri'),
  currentQuantity: integer('current_quantity').notNull().default(0),
  refillEnabled: integer('refill_enabled', { mode: 'boolean' }).notNull().default(false),
  refillThreshold: integer('refill_threshold'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const medicationVariants = sqliteTable('medication_variants', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  strengthValue: real('strength_value'),
  strengthUnit: text('strength_unit'),
  currentQuantity: integer('current_quantity').notNull().default(0),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  timesOfDay: text('times_of_day').notNull().default('[]'),
  intervalDays: integer('interval_days'),
  weekdayMask: integer('weekday_mask'),
  dayOfMonth: integer('day_of_month'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const doseEvents = sqliteTable('dose_events', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => medicationVariants.id),
  scheduleId: text('schedule_id').references(() => schedules.id),
  scheduledAt: text('scheduled_at').notNull(),
  status: text('status').notNull().default('pending'),
  takenAt: text('taken_at'),
  doseAmount: real('dose_amount').notNull().default(1),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const inventoryTransactions = sqliteTable('inventory_transactions', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => medicationVariants.id),
  type: text('type').notNull(),
  quantityDelta: integer('quantity_delta').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  doseEventId: text('dose_event_id').references(() => doseEvents.id),
  createdAt: text('created_at').notNull(),
});

export const reminderHealth = sqliteTable('reminder_health', {
  id: text('id').primaryKey().notNull().default('singleton'),
  lastReconciledAt: text('last_reconciled_at'),
  missedCount: integer('missed_count').notNull().default(0),
  blockedReason: text('blocked_reason'),
  usesNotificationFallback: integer('uses_notification_fallback', { mode: 'boolean' })
    .notNull()
    .default(false),
  updatedAt: text('updated_at').notNull(),
});

export const catalogCache = sqliteTable('catalog_cache', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  queryKey: text('query_key').notNull(),
  payload: text('payload').notNull(),
  cachedAt: text('cached_at').notNull(),
  expiresAt: text('expires_at').notNull(),
});

export type Medication = typeof medications.$inferSelect;
export type MedicationVariant = typeof medicationVariants.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type DoseEvent = typeof doseEvents.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type CatalogCacheRow = typeof catalogCache.$inferSelect;
