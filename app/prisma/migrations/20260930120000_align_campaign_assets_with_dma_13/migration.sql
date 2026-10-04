-- Align campaign_assets with DMA-13.
--
-- The table shipped in the init migration with a `header` role, a `position`
-- column, and UNIQUE (campaign_id, asset_id, role). DMA-13 drops the header
-- role and the position column, adds created_at, and allows one role per asset
-- per campaign.
--
-- The structural statements below are the SQL Prisma itself generates for this
-- schema change, verified with:
--
--   prisma migrate diff --from-schema <old> --to-schema prisma/schema.prisma --script
--
-- Two data steps are interleaved because Prisma's generated SQL cannot know
-- about existing rows and would fail on them:
--
--   1. The enum swap casts role through text, which errors while any row still
--      holds `header`, so those rows are folded into inline first.
--
--   2. The old unique key included `role`, so one asset could be bound to a
--      campaign more than once. Creating the tightened unique index would fail
--      on those rows, so duplicates are collapsed first. inline wins over
--      attachment, and header is already inline by this point.

-- 1. Fold the removed header role into inline, before the type is replaced.
UPDATE "campaign_assets" SET "role" = 'inline' WHERE "role" = 'header';

-- 2. Swap the enum. campaign_assets.role is the only column using
--    CampaignAssetRole, so the type can be replaced outright.
CREATE TYPE "CampaignAssetRole_new" AS ENUM ('inline', 'attachment');

ALTER TABLE "campaign_assets"
  ALTER COLUMN "role" TYPE "CampaignAssetRole_new"
  USING ("role"::text::"CampaignAssetRole_new");

ALTER TYPE "CampaignAssetRole" RENAME TO "CampaignAssetRole_old";
ALTER TYPE "CampaignAssetRole_new" RENAME TO "CampaignAssetRole";
DROP TYPE "CampaignAssetRole_old";

-- 3. Collapse duplicate bindings to one row per (campaign_id, asset_id), so the
--    tightened unique index can be created.
DELETE FROM "campaign_assets" "ca"
WHERE "ca"."id" NOT IN (
  SELECT DISTINCT ON ("campaign_id", "asset_id") "id"
  FROM "campaign_assets"
  ORDER BY
    "campaign_id",
    "asset_id",
    CASE "role" WHEN 'inline' THEN 0 WHEN 'attachment' THEN 1 ELSE 2 END,
    "id"
);

-- 4. Tighten the unique key to one role per asset per campaign.
--
--    DROP CONSTRAINT, not DROP INDEX. The init migration declared this as a
--    table-level UNIQUE, which Postgres implements as a unique *constraint* with
--    a backing index. Dropping the index is refused while the constraint depends
--    on it, and it has to be the constraint that goes. The replacement is added
--    the same way so it stays a constraint: a bare unique index would work, but
--    Prisma models @@unique as a table-level constraint, and a mismatch here
--    shows up as spurious drift in every later `migrate diff`.
ALTER TABLE "campaign_assets"
  DROP CONSTRAINT "campaign_assets_campaign_id_asset_id_role_key";

ALTER TABLE "campaign_assets"
  ADD CONSTRAINT "campaign_assets_campaign_id_asset_id_key"
  UNIQUE ("campaign_id", "asset_id");

-- 5. Retire the old ordering index before the column it covers goes.
--
--    This has to precede the DROP COLUMN. Postgres drops any index that references
--    a dropped column automatically, so a later DROP INDEX of this name fails with
--    "does not exist". Dropping it here keeps the intent explicit and the
--    statement order safe.
DROP INDEX "campaign_assets_campaign_id_role_position_idx";

-- 6. Drop position and add created_at. Nothing read position: the shipped UI
--    reads role and original_filename only, and DMA-13 derives inline order
--    from the Markdown AST rather than a stored ordinal. Existing rows are
--    stamped at migration time, which is the closest honest value.
ALTER TABLE "campaign_assets" DROP COLUMN "position";

ALTER TABLE "campaign_assets"
  ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 7. Replace the ordering index. position led the old one and is going away, so
--    created_at takes its place as the attachment tiebreak.
--
--    This has to come after created_at is added. An index naming a column that
--    does not exist yet fails outright in Postgres, so creating the replacement
--    before the column existed was the second way this migration could break.
CREATE INDEX "campaign_assets_campaign_id_role_created_at_idx"
  ON "campaign_assets" ("campaign_id", "role", "created_at");
