-- Public site content tables (DMA-15 to DMA-22, PS-02 to PS-13).
--
-- Structural statements below match `prisma migrate diff` output exactly. Images and
-- files reference assets with ON DELETE RESTRICT, like events.image_asset_id.

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('form', 'bylaw', 'report');

-- CreateTable
CREATE TABLE "site_content" (
    "id" UUID NOT NULL,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "home_statement" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "history" TEXT,
    "adviser_name" TEXT,
    "adviser_title" TEXT,
    "adviser_photo_asset_id" UUID,
    "join_steps" JSONB NOT NULL DEFAULT '[]',
    "membership_form_location" TEXT,
    "contact_email" TEXT,
    "location" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '[]',
    "privacy_notice_markdown" TEXT,
    "privacy_notice_updated_at" TIMESTAMPTZ(6),
    "updated_by_admin_id" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "photo_asset_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committees" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "committees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_members" (
    "id" UUID NOT NULL,
    "committee_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "photo_asset_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "committee_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_posts" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "post_date" DATE NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "cover_asset_id" UUID,
    "status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "created_by_admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logo_asset_id" UUID NOT NULL,
    "link_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_content_singleton_key" ON "site_content"("singleton");

-- CreateIndex
CREATE INDEX "officers_sort_order_idx" ON "officers"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "committees_name_key" ON "committees"("name");

-- CreateIndex
CREATE INDEX "committees_sort_order_idx" ON "committees"("sort_order");

-- CreateIndex
CREATE INDEX "committee_members_committee_id_sort_order_idx" ON "committee_members"("committee_id", "sort_order");

-- CreateIndex
CREATE INDEX "achievements_year_idx" ON "achievements"("year");

-- CreateIndex
CREATE INDEX "news_posts_status_post_date_idx" ON "news_posts"("status", "post_date");

-- CreateIndex
CREATE INDEX "sponsors_sort_order_idx" ON "sponsors"("sort_order");

-- CreateIndex
CREATE INDEX "resources_type_idx" ON "resources"("type");

-- CreateIndex
CREATE INDEX "faqs_is_featured_sort_order_idx" ON "faqs"("is_featured", "sort_order");

-- AddForeignKey
ALTER TABLE "site_content" ADD CONSTRAINT "site_content_adviser_photo_asset_id_fkey" FOREIGN KEY ("adviser_photo_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content" ADD CONSTRAINT "site_content_updated_by_admin_id_fkey" FOREIGN KEY ("updated_by_admin_id") REFERENCES "allowlist_entries"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_photo_asset_id_fkey" FOREIGN KEY ("photo_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "committees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_photo_asset_id_fkey" FOREIGN KEY ("photo_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "allowlist_entries"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_logo_asset_id_fkey" FOREIGN KEY ("logo_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Rules Prisma cannot express (DMA-15 to DMA-22).

-- 1. site_content holds one row, using the same pattern the old admins table used.
ALTER TABLE "site_content"
  ADD CONSTRAINT "site_content_singleton" CHECK ("singleton");

-- 2. An achievement year is a real year (PS-03.6 lists them newest first).
ALTER TABLE "achievements"
  ADD CONSTRAINT "achievements_year_range" CHECK ("year" BETWEEN 1900 AND 2100);

-- 3. A published news post records when it was published; drafts never show publicly.
ALTER TABLE "news_posts"
  ADD CONSTRAINT "news_posts_published_at_required"
  CHECK ("status" <> 'published' OR "published_at" IS NOT NULL);

-- 4. Sponsor links open in a new tab from the public site, so only https links are
-- stored (same rule as short_urls.destination).
ALTER TABLE "sponsors"
  ADD CONSTRAINT "sponsors_link_url_https"
  CHECK (
    "link_url" IS NULL
    OR ("link_url" ~ '^https://[^/?#[:space:]]+([/?#].*)?$' AND "link_url" !~ '[[:space:]]')
  );

-- 5. At most five FAQs are featured on Home (SY-07.6). The advisory lock makes two
-- concurrent saves take turns, so they cannot both see four and both feature a fifth.
CREATE FUNCTION limit_featured_faqs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."is_featured" AND (TG_OP = 'INSERT' OR NOT OLD."is_featured") THEN
    PERFORM pg_advisory_xact_lock(hashtext('faqs_featured'));

    IF (
      SELECT COUNT(*)
      FROM "faqs"
      WHERE "is_featured" AND "id" <> NEW."id"
    ) >= 5 THEN
      RAISE EXCEPTION 'Only five FAQs can be featured on Home.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER faqs_limit_featured
BEFORE INSERT OR UPDATE ON "faqs"
FOR EACH ROW EXECUTE FUNCTION limit_featured_faqs();
