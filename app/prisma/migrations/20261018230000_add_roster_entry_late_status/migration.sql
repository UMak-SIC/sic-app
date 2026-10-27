-- 1. Add 'late' to RosterEntryStatus enum
ALTER TYPE "RosterEntryStatus" ADD VALUE 'late';

-- 2. Update check constraint to permit arrived_at & scanned_by_admin_id on 'late'
ALTER TABLE "event_roster_entries"
  DROP CONSTRAINT IF EXISTS "event_roster_entries_check";

ALTER TABLE "event_roster_entries"
  ADD CONSTRAINT "event_roster_entries_check"
  CHECK (
    ("status" IN ('attended', 'late') AND "arrived_at" IS NOT NULL AND "scanned_by_admin_id" IS NOT NULL)
    OR
    ("status" NOT IN ('attended', 'late') AND "arrived_at" IS NULL AND "scanned_by_admin_id" IS NULL)
  );

-- 3. Update search_global_attendees RPC to include 'late' in attended counts
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
    SELECT 1 FROM public.admins WHERE neon_auth_user_id = p_admin_id
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
