-- Replace the single-row "admins" table with "allowlist_entries" (DMA-01, AC-02 to AC-04).
--
-- The old table allowed exactly one administrator. The SIC App lets many emails into
-- the dashboard, each with one role. Every "who did this" column (events, roster
-- scans, campaigns, assets, short links) keeps its name and its TEXT value and now
-- references allowlist_entries.neon_auth_user_id, so no existing row changes.

-- 1. The role type and the table.
CREATE TYPE "AllowlistRole" AS ENUM ('system_admin', 'executive', 'event_head', 'committee');

CREATE TABLE "allowlist_entries" (
    "id" UUID NOT NULL,
    "normalized_email" TEXT,
    "role" "AllowlistRole" NOT NULL,
    "access_ends_on" DATE,
    "neon_auth_user_id" TEXT,
    "added_by_entry_id" UUID,
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "allowlist_entries_pkey" PRIMARY KEY ("id"),
    -- Emails are compared ignoring case and surrounding spaces (AC-02.2), so they are
    -- stored that way and the unique index below catches duplicates.
    CONSTRAINT "allowlist_entries_email_normalized"
      CHECK ("normalized_email" = lower(btrim("normalized_email"))),
    -- An entry is added by email; the migrated administrator below may have only a user ID.
    CONSTRAINT "allowlist_entries_identity_present"
      CHECK ("normalized_email" IS NOT NULL OR "neon_auth_user_id" IS NOT NULL),
    -- Executive Committee and Committee access ends with their term (AC-04.7).
    CONSTRAINT "allowlist_entries_term_end_required"
      CHECK ("role" NOT IN ('executive', 'committee') OR "access_ends_on" IS NOT NULL)
);

CREATE UNIQUE INDEX "allowlist_entries_normalized_email_key" ON "allowlist_entries"("normalized_email");

CREATE UNIQUE INDEX "allowlist_entries_neon_auth_user_id_key" ON "allowlist_entries"("neon_auth_user_id");

ALTER TABLE "allowlist_entries" ADD CONSTRAINT "allowlist_entries_added_by_entry_id_fkey" FOREIGN KEY ("added_by_entry_id") REFERENCES "allowlist_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Carry the existing administrator over as the first System Administrator.
INSERT INTO "allowlist_entries" ("id", "role", "neon_auth_user_id", "created_at", "updated_at")
SELECT gen_random_uuid(), 'system_admin', "neon_auth_user_id", "created_at", CURRENT_TIMESTAMP
FROM "admins";

-- 3. Fill that administrator's email from Neon Auth when its user table is readable.
-- The table is looked up rather than named, so a database without Neon Auth (the
-- empty CI branch) applies this migration unchanged. Without it the email stays
-- empty and `pnpm admin:bootstrap` with ADMIN_EMAIL fills it.
DO $$
DECLARE
  source_table TEXT;
BEGIN
  SELECT email_column.table_name INTO source_table
  FROM information_schema.columns AS email_column
  WHERE email_column.table_schema = 'neon_auth'
    AND email_column.column_name = 'email'
    AND email_column.table_name IN ('user', 'users_sync')
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns AS id_column
      WHERE id_column.table_schema = 'neon_auth'
        AND id_column.table_name = email_column.table_name
        AND id_column.column_name = 'id'
    )
  ORDER BY (email_column.table_name = 'user') DESC
  LIMIT 1;

  IF source_table IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.allowlist_entries AS entry
       SET normalized_email = lower(btrim(account.email))
       FROM neon_auth.%I AS account
       WHERE account.id::text = entry.neon_auth_user_id
         AND account.email IS NOT NULL',
      source_table
    );
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Neon Auth users are not readable; run pnpm admin:bootstrap with ADMIN_EMAIL.';
END;
$$;

-- 4. Point every "who did this" column at the allowlist. Names and ON DELETE RESTRICT
-- are unchanged, so a removed person is kept (removed_at) rather than deleted.
ALTER TABLE "events" DROP CONSTRAINT "events_created_by_admin_id_fkey";
ALTER TABLE "event_roster_entries" DROP CONSTRAINT "event_roster_entries_scanned_by_admin_id_fkey";
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_created_by_admin_id_fkey";
ALTER TABLE "assets" DROP CONSTRAINT "assets_uploaded_by_admin_id_fkey";
ALTER TABLE "short_urls" DROP CONSTRAINT "short_urls_created_by_admin_id_fkey";

ALTER TABLE "events" ADD CONSTRAINT "events_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "allowlist_entries"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_roster_entries" ADD CONSTRAINT "event_roster_entries_scanned_by_admin_id_fkey" FOREIGN KEY ("scanned_by_admin_id") REFERENCES "allowlist_entries"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "allowlist_entries"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_admin_id_fkey" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "allowlist_entries"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "short_urls" ADD CONSTRAINT "short_urls_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "allowlist_entries"("neon_auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. The attendee search checks access inside the database. The body is unchanged from
-- 20261018230000_add_roster_entry_late_status except that check, which now reads the
-- allowlist and refuses a removed entry. CREATE OR REPLACE keeps the existing
-- REVOKE ALL ... FROM PUBLIC.
CREATE OR REPLACE FUNCTION public.search_global_attendees(
  p_admin_id TEXT,
  p_search TEXT DEFAULT NULL,
  p_attended_only BOOLEAN DEFAULT false,
  p_course TEXT DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 25
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  student_id TEXT,
  display_email TEXT,
  course TEXT,
  program TEXT,
  section TEXT,
  created_at TIMESTAMPTZ,
  events JSONB,
  organized_events JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.allowlist_entries
    WHERE neon_auth_user_id = p_admin_id
      AND removed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Administrator access is required.' USING ERRCODE = '42501';
  END IF;

  IF p_page < 1 OR p_page_size < 1 OR p_page_size > 100 THEN
    RAISE EXCEPTION 'Invalid attendee page request.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT attendee.*
    FROM public.attendees AS attendee
    WHERE attendee.deleted_at IS NULL
      AND (
        p_search IS NULL
        OR attendee.name ILIKE '%' || p_search || '%'
        OR attendee.display_email ILIKE '%' || p_search || '%'
        OR attendee.student_id ILIKE '%' || p_search || '%'
      )
      AND (p_course IS NULL OR attendee.course = p_course)
      AND (
        NOT p_attended_only
        OR EXISTS (
          SELECT 1
          FROM public.event_roster_entries AS roster_entry
          WHERE roster_entry.attendee_id = attendee.id
            AND roster_entry.status IN ('attended', 'late')
        )
      )
      AND (
        p_event_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.event_roster_entries AS roster_entry
          WHERE roster_entry.attendee_id = attendee.id
            AND roster_entry.event_id = p_event_id
        )
      )
  )
  SELECT
    attendee.id,
    attendee.name,
    attendee.student_id,
    attendee.display_email,
    attendee.course,
    attendee.program,
    attendee.section,
    attendee.created_at,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', event.id,
          'name', event.name,
          'startsAt', event.starts_at,
          'attended', roster_entry.status IN ('attended', 'late')
        )
        ORDER BY event.starts_at DESC
      )
      FROM public.event_roster_entries AS roster_entry
      JOIN public.events AS event ON event.id = roster_entry.event_id
      WHERE roster_entry.attendee_id = attendee.id
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', event.id,
          'name', event.name,
          'startsAt', event.starts_at
        )
        ORDER BY event.starts_at DESC
      )
      FROM public.event_organizers AS organizer
      JOIN public.events AS event ON event.id = organizer.event_id
      WHERE organizer.attendee_id = attendee.id
    ), '[]'::jsonb),
    (SELECT COUNT(*) FROM filtered)
  FROM filtered AS attendee
  ORDER BY attendee.name ASC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

-- 6. The last active System Administrator cannot be removed, deleted or given another
-- role (AC-04.6). The advisory lock makes two concurrent removals take turns, so they
-- cannot each see the other as the remaining administrator.
CREATE FUNCTION keep_one_system_admin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."role" = 'system_admin'
     AND OLD."removed_at" IS NULL
     AND (TG_OP = 'DELETE' OR NEW."role" <> 'system_admin' OR NEW."removed_at" IS NOT NULL) THEN
    PERFORM pg_advisory_xact_lock(hashtext('allowlist_entries_system_admin'));

    IF NOT EXISTS (
      SELECT 1
      FROM "allowlist_entries"
      WHERE "role" = 'system_admin'
        AND "removed_at" IS NULL
        AND "id" <> OLD."id"
    ) THEN
      RAISE EXCEPTION 'The last System Administrator cannot be removed or given another role.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER allowlist_entries_keep_system_admin
BEFORE UPDATE OR DELETE ON "allowlist_entries"
FOR EACH ROW EXECUTE FUNCTION keep_one_system_admin();

-- 7. Nothing references the old table any more.
DROP TABLE "admins";
