export const MIGRATION_SQL = `
ALTER TABLE medications ADD COLUMN pill_color2 TEXT;
`;

export const SCHEMA_VERSION = 2;
