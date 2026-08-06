-- Hybrid search support for the psx_kse100 vector table.
--
-- Run ONCE against an existing database:
--   psql "$DATABASE_URL" -f data-pipeline/migrations/0001_hybrid_search.sql
--
-- Fresh installs get this automatically from ingest.py's ensure_table().
-- Every statement is idempotent, so re-running is harmless.
--
-- No re-embedding or re-ingestion is needed: `tsv` is a generated column, so
-- the ALTER TABLE backfills every existing row and Postgres keeps it in sync
-- on all future writes with no changes to the insert path.

-- Full-text index over the document body — the "exact word matching" lane.
ALTER TABLE "psx_kse100"
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("text", ''))) STORED;

CREATE INDEX IF NOT EXISTS psx_kse100_tsv_idx
  ON "psx_kse100" USING GIN (tsv);

-- Direct ticker lookups — the symbol lane.
CREATE INDEX IF NOT EXISTS psx_kse100_symbol_idx
  ON "psx_kse100" ((metadata->>'symbol'));
