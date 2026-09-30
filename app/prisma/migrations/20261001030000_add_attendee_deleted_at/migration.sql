-- Lets an administrator remove a student from the directory without erasing them.
--
-- The column is nullable so every existing row is an active student: no backfill,
-- and a row with no value here is one that is still in the directory.
--
-- No index. Every read that needs it already filters on `deleted_at IS NULL`, which
-- is the overwhelmingly common case, and an index on a column that is null for
-- almost every row would not help those queries. The partial index that would help
-- ("only removed rows") is not expressible in a portable migration.
ALTER TABLE "attendees" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
