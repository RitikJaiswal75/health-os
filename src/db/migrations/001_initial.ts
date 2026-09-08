export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT,
  notes TEXT,
  medication_type TEXT NOT NULL DEFAULT 'tablet',
  strength_value REAL,
  strength_unit TEXT,
  pill_shape TEXT,
  pill_color TEXT,
  photo_uri TEXT,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  refill_enabled INTEGER NOT NULL DEFAULT 0,
  refill_threshold INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medication_variants (
  id TEXT PRIMARY KEY NOT NULL,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  strength_value REAL,
  strength_unit TEXT,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY NOT NULL,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  times_of_day TEXT NOT NULL DEFAULT '[]',
  interval_days INTEGER,
  weekday_mask INTEGER,
  day_of_month INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dose_events (
  id TEXT PRIMARY KEY NOT NULL,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES medication_variants(id),
  schedule_id TEXT REFERENCES schedules(id),
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  taken_at TEXT,
  dose_amount REAL NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES medication_variants(id),
  type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  dose_event_id TEXT REFERENCES dose_events(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminder_health (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'singleton',
  last_reconciled_at TEXT,
  missed_count INTEGER NOT NULL DEFAULT 0,
  blocked_reason TEXT,
  uses_notification_fallback INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_cache (
  id TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL,
  query_key TEXT NOT NULL,
  payload TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dose_events_scheduled ON dose_events(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_dose_events_medication ON dose_events(medication_id);
CREATE INDEX IF NOT EXISTS idx_catalog_cache_query ON catalog_cache(source, query_key);
CREATE INDEX IF NOT EXISTS idx_catalog_cache_expires ON catalog_cache(expires_at);
`;

export const SCHEMA_VERSION = 1;
