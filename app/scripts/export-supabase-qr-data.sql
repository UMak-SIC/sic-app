-- One-time export of the standalone QR Generator's Supabase data for the Neon
-- import. Run it with an operator-held direct database connection; it reads
-- private.visit_events directly so no public RPC has to expose raw scans.
--
--   psql "$SUPABASE_DB_URL" --no-psqlrc -f scripts/export-supabase-qr-data.sql \
--     -o qr-export.json
--
-- The output holds every link destination and scan timestamp. Keep it out of
-- the repository and delete it after the verified cutover.
--
-- Timestamps and counters are emitted as text so microsecond precision and
-- 64-bit counts survive the trip through JavaScript unchanged.

\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned

-- One read-only snapshot keeps the links and their scans consistent with each
-- other even while the legacy resolver is still recording visits.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;

SELECT json_build_object(
  'format', 'sic-qr-export/v1',
  'exportedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'links', COALESCE((
    SELECT json_agg(json_build_object(
      'id', u.id,
      'code', u.url_id,
      'name', u.name,
      'destination', u.original_url,
      'viewCount', u.view_count::text,
      'status', u.status,
      'expiresAt', to_char(u.expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'qrForeground', u.qr_foreground,
      'qrBackground', u.qr_background,
      'qrLogoUrl', u.qr_logo_url,
      'createdAt', to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'updatedAt', to_char(u.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    ) ORDER BY u.created_at, u.id)
    FROM public.urls u
  ), '[]'::json),
  'visits', COALESCE((
    SELECT json_agg(json_build_object(
      'linkId', e.url_id,
      'visitedAt', to_char(e.visited_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    ) ORDER BY e.id)
    FROM private.visit_events e
  ), '[]'::json)
);

COMMIT;
