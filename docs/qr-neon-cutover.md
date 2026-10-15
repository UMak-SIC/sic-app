# QR Generator: Supabase to Neon cutover

Operational runbook for moving the standalone `SIC-QR-GENERATOR` links, scan
history, and logos into SIC-APP's Neon database, then pointing printed codes at
the SIC-APP resolver.

Nothing here runs automatically. Every production step needs explicit approval
after the dry-run report has been reviewed.

## What changes for a printed code

The legacy app encoded `https://sic-qr-gen.vercel.app/<code>` (see its
`VITE_APP_URL` and `vercel.json`). SIC-APP resolves
`https://umak-sic.vercel.app/url/<code>`. Codes already on posters keep the old
address forever, so **the legacy host can never simply be deleted**. After
cutover it must keep redirecting `/<code>` to the new resolver (step 6).

Codes, link ids, destinations, status, expiry, colors, creation time, scan
counts, and every scan timestamp are carried over unchanged.

## Tools

All commands run from `app/`.

| Step | Command | Writes to |
| --- | --- | --- |
| Export | `psql "$SUPABASE_DB_URL" --no-psqlrc -f scripts/export-supabase-qr-data.sql -o qr-export.json` | nothing (read-only snapshot) |
| Import | `node --env-file=.env.local scripts/import-supabase-qr-data.mjs qr-export.json [--dry-run] [--report <file>]` | Neon `short_urls`, `short_url_visits`, `assets`; Neon `public-images` |
| Verify | `node --env-file=.env.local scripts/verify-qr-import.mjs qr-export.json [--after-cutover] [--allow-unmigrated-logos]` | nothing |

The `pnpm qr:import` and `pnpm qr:verify` scripts run the same files.

### Environment

| Variable | Used by | Notes |
| --- | --- | --- |
| `SUPABASE_DB_URL` | export (`psql`) | Direct (port 5432) connection for the legacy project. Operator-held, never in Vercel. |
| `DATABASE_URL` | import, verify | The target Neon database. |
| `QR_MIGRATION_ADMIN_ID` | import | Neon Auth user id of the SIC administrator; imported links are assigned to them. Must already exist in `admins`. |
| `AWS_*` storage values | import (not `--dry-run`) | Same Neon Object Storage values the app uses. |

Remove `SUPABASE_DB_URL` and `QR_MIGRATION_ADMIN_ID` from your shell and env
files once the cutover is signed off.

### Behavior worth knowing

- **Export** reads `public.urls` and `private.visit_events` in one
  `REPEATABLE READ` snapshot, so the links and their scans always agree. It does
  not add a public RPC. The file contains every destination and scan time, so
  keep it out of git and delete it after sign-off.
- **Import** validates the whole file before it connects for writes, confirms
  `QR_MIGRATION_ADMIN_ID` exists, and **stops before writing anything** if any
  code or id already belongs to a different Neon link.
- Links and visits go in as **one SQL statement**: all of them or none.
  Existing ids are skipped (`ON CONFLICT (id) DO NOTHING`), so re-running is
  safe. The exception is scans that the legacy resolver recorded since the last
  run: those are added to the existing link and its scan count goes up by the
  same amount. Each scan is compared as a (link, timestamp) pair.
- **Logos** are downloaded (HTTPS only, no redirects, 15 s timeout, 10 MiB cap)
  and checked with the same Sharp rules as dashboard uploads. They are saved as
  WebP in `public-images` and get a new `Asset` row. A logo that cannot be
  retrieved is written to the unmigrated-logo report
  (`qr-unmigrated-logos.json` by default), and its link is imported **without**
  a logo. A Supabase URL is never kept. If the link write fails, the uploaded
  logos are removed again.
- **Verify** compares, inside Postgres and to the microsecond: link count, each
  link's code, name, destination, status, expiry, colors and creation time,
  total scan count, visit rows (as a multiset), and logo presence. It exits
  non-zero on any difference. `--after-cutover` allows Neon to have *more*
  scans than the source, never fewer.

## Procedure

### 1. Dry run on disposable data

1. Create a throwaway Neon branch from production, and run
   `pnpm db:deploy` against it if the QR migration is not there yet.
2. Point `DATABASE_URL` at that branch only. Use a copy of the Supabase
   project, or a local Postgres with the four legacy migrations, as the
   export source.
3. Run export, then `--dry-run` import, then the real import, then verify. Run
   the import a second time and confirm it reports `insertedLinks: 0`.
4. Open `/qr` on a preview deployment that uses the branch. Confirm the links,
   counts, and logos, and that `/url/<code>` redirects for an active code and
   returns 404 for a paused, expired, or unknown one.
5. Share the console output and the unmigrated-logo report for review, then
   delete the branch.

### 2. Production import (approval required)

1. Deploy SIC-APP with the QR migration (`pnpm db:deploy`) and confirm
   `https://umak-sic.vercel.app/qr` works for the administrator.
2. Export from production Supabase. Run the `--dry-run` import against
   production Neon and check the counts.
3. Run the import, then the verifier in exact mode. **Do not continue unless
   it passes.** Use `--allow-unmigrated-logos` only for logos the approver has
   accepted re-uploading by hand.

### 3. Smoke-test SIC-APP before switching traffic

On production, with an external browser and phone:

- Create a new link. Its QR decodes to `https://umak-sic.vercel.app/url/<code>`,
  scanning returns an HTTPS 302 to the destination, and the scan count goes
  up by exactly one.
- Run `curl -sI https://umak-sic.vercel.app/url/<imported code>` for an imported
  active code (expect 302 and the right `Location`). Check paused, expired, and
  made-up codes (expect 404, with no destination in the body or headers).
- Download a logo QR and confirm it still decodes.
- Check the `/qr` dashboard on mobile.

### 4. Redirect the legacy host (approval required)

In `SIC-QR-GENERATOR/vercel.json`, replace the resolver route so that legacy
paths redirect instead of resolving through Supabase:

```json
{
  "routes": [
    { "src": "^/([A-Za-z]{7})$", "status": 302,
      "headers": { "Location": "https://umak-sic.vercel.app/url/$1" } },
    { "src": "^/(.*)$", "status": 302,
      "headers": { "Location": "https://umak-sic.vercel.app/qr" } }
  ]
}
```

A 302, not a 308, keeps browsers from caching the hop permanently while the
cutover is still reversible. SIC-APP counts the scan; the legacy app no longer
does.

### 5. Final top-up

Scans that reached the legacy resolver between the export in step 2 and the
redirect in step 4 are still only in Supabase. Export again, re-run the import
(it appends only those scans), and verify with `--after-cutover`.

### 6. Retire Supabase (separate approval)

Keep the legacy Vercel project serving the redirect from step 4 permanently.
After the verification report has been signed off, the Supabase project,
its environment variables, and the legacy app's Supabase dependencies can be
removed in a follow-up.

## Rollback

Before step 4, the legacy app is untouched. To roll back, delete the imported
rows from Neon (the ids are in the export) and try again. After step 4, revert
the legacy `vercel.json`. Scans recorded by SIC-APP in the meantime stay in
Neon and are not copied back.

## Audit record

Fill this in when production is complete. Never record secrets or connection
strings.

| Field | Value |
| --- | --- |
| Dry run completed (UTC) | |
| Production import completed (UTC) | |
| Export `exportedAt` | |
| Source links / target links | |
| Source scans / target scans | |
| Source visits / target visits | |
| Unmigrated logos (codes) | |
| Legacy redirect switched (UTC) | |
| Final top-up verified (UTC) | |
| Environment tested | |
| Approver | |
