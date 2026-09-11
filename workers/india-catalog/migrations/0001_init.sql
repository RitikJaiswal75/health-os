CREATE TABLE IF NOT EXISTS drugs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  strength TEXT,
  form TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS drug_search USING fts5(
  name,
  strength,
  form,
  content='drugs',
  content_rowid='id'
);
