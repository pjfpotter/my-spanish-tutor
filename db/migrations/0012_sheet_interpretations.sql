-- Processed sentence builders (sheet-ingestion: Cached by content). One row per document content, prompt
-- version and schema version, so re-uploading an unchanged sheet makes no model call. The interpretation
-- holds chunk references and teacher corrections (with the printed text); it holds nothing about a student.
create table sheet_interpretations (
  cache_key text primary key,
  interpretation jsonb not null,
  repairs integer not null default 0,
  cost_gbp numeric not null default 0,
  created_at timestamptz not null default now()
);
