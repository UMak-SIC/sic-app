CREATE TYPE "EventStatus" AS ENUM ('draft', 'published', 'closed');
CREATE TYPE "RosterEntryStatus" AS ENUM ('pending', 'attended', 'absent');
CREATE TYPE "DeliveryStatus" AS ENUM ('queued', 'sending', 'sent', 'bounced', 'failed');
CREATE TYPE "QueueJobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE "EmailProvider" AS ENUM ('mailgun', 'brevo');
CREATE TYPE "CampaignAssetRole" AS ENUM ('header', 'inline', 'attachment');

CREATE TABLE "admins" (
  "neon_auth_user_id" TEXT NOT NULL PRIMARY KEY,
  "singleton" BOOLEAN NOT NULL DEFAULT true UNIQUE CHECK ("singleton"),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "attendees" (
  "id" UUID NOT NULL PRIMARY KEY,
  "normalized_email" TEXT NOT NULL UNIQUE,
  "display_email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "student_id" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL
);

CREATE TABLE "events" (
  "id" UUID NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "image_asset_id" UUID,
  "starts_at" TIMESTAMPTZ(6) NOT NULL,
  "ends_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "EventStatus" NOT NULL DEFAULT 'draft',
  "created_by_admin_id" TEXT NOT NULL,
  "closed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CHECK ("ends_at" > "starts_at")
);

CREATE TABLE "event_roster_entries" (
  "id" UUID NOT NULL PRIMARY KEY,
  "event_id" UUID NOT NULL,
  "attendee_id" UUID NOT NULL,
  "status" "RosterEntryStatus" NOT NULL DEFAULT 'pending',
  "arrived_at" TIMESTAMPTZ(6),
  "scanned_by_admin_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  UNIQUE ("event_id", "attendee_id"),
  UNIQUE ("event_id", "id"),
  CHECK (("status" = 'attended' AND "arrived_at" IS NOT NULL AND "scanned_by_admin_id" IS NOT NULL) OR ("status" <> 'attended' AND "arrived_at" IS NULL AND "scanned_by_admin_id" IS NULL))
);

CREATE TABLE "campaigns" (
  "id" UUID NOT NULL PRIMARY KEY,
  "event_id" UUID NOT NULL,
  "subject" TEXT NOT NULL,
  "markdown" TEXT NOT NULL,
  "created_by_admin_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  UNIQUE ("event_id", "id")
);

CREATE TABLE "campaign_assets" (
  "id" UUID NOT NULL PRIMARY KEY,
  "campaign_id" UUID NOT NULL,
  "asset_id" UUID NOT NULL,
  "role" "CampaignAssetRole" NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("campaign_id", "asset_id", "role")
);

CREATE TABLE "email_deliveries" (
  "id" UUID NOT NULL PRIMARY KEY,
  "event_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "roster_entry_id" UUID NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'queued',
  "provider" "EmailProvider",
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "provider_message_id" TEXT,
  "failure_code" TEXT,
  "failure_message" TEXT,
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  UNIQUE ("campaign_id", "roster_entry_id")
);

CREATE TABLE "queue_jobs" (
  "id" UUID NOT NULL PRIMARY KEY,
  "delivery_id" UUID NOT NULL UNIQUE,
  "status" "QueueJobStatus" NOT NULL DEFAULT 'queued',
  "scheduled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_at" TIMESTAMPTZ(6),
  "lock_expires_at" TIMESTAMPTZ(6),
  "locked_by" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  "last_error" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CHECK ("retry_count" >= 0 AND "max_retries" >= 0)
);

CREATE TABLE "delivery_attempts" (
  "id" UUID NOT NULL PRIMARY KEY,
  "delivery_id" UUID NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "provider" "EmailProvider" NOT NULL,
  "provider_message_id" TEXT,
  "http_status" INTEGER,
  "request_payload" JSONB,
  "response_payload" JSONB,
  "error_message" TEXT,
  "attempted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("delivery_id", "attempt_number")
);

CREATE TABLE "provider_daily_usage" (
  "id" UUID NOT NULL PRIMARY KEY,
  "provider" "EmailProvider" NOT NULL,
  "usage_date" DATE NOT NULL,
  "reserved_count" INTEGER NOT NULL DEFAULT 0,
  "sent_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  UNIQUE ("provider", "usage_date"),
  CHECK ("reserved_count" >= 0 AND "sent_count" >= 0 AND "sent_count" <= "reserved_count")
);

CREATE TABLE "assets" (
  "id" UUID NOT NULL PRIMARY KEY,
  "object_key" TEXT NOT NULL UNIQUE,
  "original_filename" TEXT NOT NULL,
  "media_type" TEXT NOT NULL,
  "byte_size" BIGINT NOT NULL CHECK ("byte_size" >= 0),
  "uploaded_by_admin_id" TEXT NOT NULL,
  "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "events_status_starts_at_idx" ON "events" ("status", "starts_at");
CREATE INDEX "event_roster_entries_event_id_status_idx" ON "event_roster_entries" ("event_id", "status");
CREATE INDEX "campaigns_event_id_created_at_idx" ON "campaigns" ("event_id", "created_at");
CREATE INDEX "campaign_assets_campaign_id_role_position_idx" ON "campaign_assets" ("campaign_id", "role", "position");
CREATE INDEX "email_deliveries_campaign_id_status_idx" ON "email_deliveries" ("campaign_id", "status");
CREATE INDEX "queue_jobs_status_scheduled_at_idx" ON "queue_jobs" ("status", "scheduled_at");
CREATE INDEX "delivery_attempts_delivery_id_attempted_at_idx" ON "delivery_attempts" ("delivery_id", "attempted_at");

ALTER TABLE "events" ADD CONSTRAINT "events_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_roster_entries" ADD CONSTRAINT "event_roster_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_roster_entries" ADD CONSTRAINT "event_roster_entries_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_roster_entries" ADD CONSTRAINT "event_roster_entries_scanned_by_admin_id_fkey" FOREIGN KEY ("scanned_by_admin_id") REFERENCES "admins"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_event_id_campaign_id_fkey" FOREIGN KEY ("event_id", "campaign_id") REFERENCES "campaigns"("event_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_event_id_roster_entry_id_fkey" FOREIGN KEY ("event_id", "roster_entry_id") REFERENCES "event_roster_entries"("event_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "queue_jobs" ADD CONSTRAINT "queue_jobs_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "email_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "email_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_admin_id_fkey" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "admins"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_delivery_attempt_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'delivery_attempts is append-only';
END;
$$;

CREATE TRIGGER delivery_attempts_no_update
BEFORE UPDATE ON "delivery_attempts"
FOR EACH ROW EXECUTE FUNCTION prevent_delivery_attempt_mutation();

CREATE TRIGGER delivery_attempts_no_direct_delete
BEFORE DELETE ON "delivery_attempts"
FOR EACH ROW WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION prevent_delivery_attempt_mutation();
