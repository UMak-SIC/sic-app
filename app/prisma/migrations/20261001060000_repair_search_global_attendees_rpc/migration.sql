-- Reassert the text-based administrator ID contract in environments whose
-- deployed function signature does not match the application contract.
CREATE OR REPLACE FUNCTION public.search_global_attendees(
  p_admin_id TEXT,
  p_search TEXT DEFAULT NULL,
  p_attended_only BOOLEAN DEFAULT false,
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
      AND (
        NOT p_attended_only
        OR EXISTS (
          SELECT 1
          FROM public.event_roster_entries AS roster_entry
          WHERE roster_entry.attendee_id = attendee.id
            AND roster_entry.status = 'attended'
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
          'attended', roster_entry.status = 'attended'
        )
        ORDER BY event.starts_at DESC
      )
      FROM public.event_roster_entries AS roster_entry
      JOIN public.events AS event ON event.id = roster_entry.event_id
      WHERE roster_entry.attendee_id = attendee.id
    ), '[]'::jsonb),
    COUNT(*) OVER ()
  FROM filtered AS attendee
  ORDER BY attendee.name ASC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

REVOKE ALL ON FUNCTION public.search_global_attendees(TEXT, TEXT, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC;
