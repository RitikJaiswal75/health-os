export const MIGRATION_SQL = `
ALTER TABLE medications ADD COLUMN dose_unit_value REAL;
ALTER TABLE medications ADD COLUMN dose_unit_unit TEXT;
`;

export const SCHEMA_VERSION = 3;
