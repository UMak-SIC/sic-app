CREATE TABLE "asset_deletion_failures" (
  "asset_id" UUID NOT NULL,
  "error_message" TEXT NOT NULL,
  "first_failed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_failed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_deletion_failures_pkey" PRIMARY KEY ("asset_id"),
  CONSTRAINT "asset_deletion_failures_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
