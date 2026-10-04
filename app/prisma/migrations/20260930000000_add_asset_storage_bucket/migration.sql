CREATE TYPE "AssetBucket" AS ENUM ('private-images', 'public-images');

ALTER TABLE "assets" ADD COLUMN "storage_bucket" "AssetBucket";

-- Run `pnpm assets:backfill-buckets` with production storage credentials before
-- relying on legacy rows. It verifies exactly one bucket via HeadObject rather
-- than guessing. New uploads always persist this value.
