-- Event theme, registration link, SDE videos and photo gallery (DMA-03, DMA-24, DMA-25;
-- EV-01, EV-06, EV-07, PS-05, PS-14). Structural statements match `prisma migrate diff`.

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "registration_link" TEXT,
ADD COLUMN     "theme" TEXT;

-- CreateTable
CREATE TABLE "event_sde_videos" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "video_url" TEXT,
    "asset_id" UUID,
    "title" TEXT,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_sde_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_photos" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "web_asset_id" UUID,
    "alt_text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by_admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_sde_videos_event_id_sort_order_idx" ON "event_sde_videos"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_photos_event_id_sort_order_idx" ON "event_photos"("event_id", "sort_order");

-- AddForeignKey
ALTER TABLE "event_sde_videos" ADD CONSTRAINT "event_sde_videos_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sde_videos" ADD CONSTRAINT "event_sde_videos_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_web_asset_id_fkey" FOREIGN KEY ("web_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_uploaded_by_admin_id_fkey" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "allowlist_entries"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Rules Prisma cannot express (DMA-03 update, DMA-24, DMA-25).

-- 1. The registration link opens in a new tab from the public event page, so only
-- https links are stored (same rule as short_urls.destination and sponsors.link_url).
ALTER TABLE "events"
  ADD CONSTRAINT "events_registration_link_https"
  CHECK (
    "registration_link" IS NULL
    OR ("registration_link" ~ '^https://[^/?#[:space:]]+([/?#].*)?$' AND "registration_link" !~ '[[:space:]]')
  );

-- 2. An SDE video is a link or an uploaded file, exactly one (EV-06.2). Links are https.
ALTER TABLE "event_sde_videos"
  ADD CONSTRAINT "event_sde_videos_one_source"
  CHECK (("video_url" IS NULL) <> ("asset_id" IS NULL));

ALTER TABLE "event_sde_videos"
  ADD CONSTRAINT "event_sde_videos_video_url_https"
  CHECK (
    "video_url" IS NULL
    OR ("video_url" ~ '^https://[^/?#[:space:]]+([/?#].*)?$' AND "video_url" !~ '[[:space:]]')
  );

-- 3. Every photo has alt text before it is shown (EV-07.3).
ALTER TABLE "event_photos"
  ADD CONSTRAINT "event_photos_alt_text_present"
  CHECK (length(btrim("alt_text")) > 0);

-- 4. One gallery cover per event (EV-07.5). The advisory lock makes two concurrent
-- saves take turns, so they cannot both see no cover and both set one.
CREATE FUNCTION limit_event_photo_cover() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."is_cover" AND (TG_OP = 'INSERT' OR NOT OLD."is_cover" OR NEW."event_id" <> OLD."event_id") THEN
    PERFORM pg_advisory_xact_lock(hashtext('event_photos_cover'), hashtext(NEW."event_id"::text));

    IF EXISTS (
      SELECT 1
      FROM "event_photos"
      WHERE "event_id" = NEW."event_id" AND "is_cover" AND "id" <> NEW."id"
    ) THEN
      RAISE EXCEPTION 'An event can have only one cover photo.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER event_photos_one_cover
BEFORE INSERT OR UPDATE ON "event_photos"
FOR EACH ROW EXECUTE FUNCTION limit_event_photo_cover();
