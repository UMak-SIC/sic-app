## Goal

Bring `campaign_assets` in line with the DMA-13 decision recorded in issue #90,
and own the asset-binding write path so TSK-0604 can be built against a defined
model.

## Source Of Truth

- GitHub epic [#58: EPIC-06 Email Composer, Markdown Engine & QR Ticket Generation](https://github.com/UMak-SIC/sic-app/issues/58)
- GitHub decision issue [#90: TSK-0607 campaign_assets definition](https://github.com/UMak-SIC/sic-app/issues/90) (closed)
- `docs/traceability-matrix.md` (TSK-0607, TSK-0608, DMA-11, DMA-13, US-14, US-16)
- `app/prisma/schema.prisma`
- `app/prisma/migrations/20260927000000_init/migration.sql`
- `plans/TSK-0607 Campaign Assets Decision.md`
- `CONTEXT.md` (Asset, Campaign)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider
traceability matrix are historical/derived context, not decision inputs.

**No GitHub issue exists for TSK-0608 yet.** The task ID is in the matrix only,
which is the drift this sprint set out to close. The PR needs the issue filed so
it can carry a `Refs:` trailer and so the matrix row points at something.

## What The Merge Left Behind

The frontend merge shipped a `campaign_assets` table in the init migration that
contradicts the decision made in #90 on every axis that matters:

| | Shipped | DMA-13 |
| --- | --- | --- |
| `CampaignAssetRole` | `HEADER`, `INLINE`, `ATTACHMENT` | drop `HEADER` |
| Columns | `position INTEGER NOT NULL DEFAULT 0` | drop `position` |
| | no `created_at` | add `created_at` |
| Unique | `UNIQUE (campaign_id, asset_id, role)` | `UNIQUE (campaign_id, asset_id)` |
| Index | `(campaign_id, role, position)` | `(campaign_id, role, created_at)` |

The reason for dropping `position` is that no query used it. Every existing row
carries `position = 0`, so the ordinal never actually ordered anything, and
inline order is better derived from the Markdown AST at render time.

The reason for tightening the unique key is that `role` in the key let one asset
be bound to the same campaign under two different roles, which is not a state
the renderer can act on.

The blast radius is nil: a repository-wide grep for `position` and `HEADER`
against the `campaign_assets` model found no readers. The only `position` hit in
the app is a Radix `select` prop in `app/components/ui/select.tsx`, unrelated.

## Migration

`app/prisma/migrations/20260930120000_align_campaign_assets_with_dma_13/migration.sql`

The structural statements are Prisma's own, verified with:

```
prisma migrate diff --from-schema <old> --to-schema prisma/schema.prisma --script
```

Matching Prisma's output exactly avoids a drift report on the next `migrate
dev`. That generated SQL was compared line by line against the hand-written
migration, and two mechanical differences were adopted from it: the old unique is
dropped as an index rather than a constraint, and the enum swap renames the old
type aside before dropping it.

Two data steps are interleaved, because Prisma's SQL cannot know about existing
rows and would fail on them.

**Duplicate bindings are collapsed first.** The old key included `role`, so one
asset could hold several roles for a campaign, and creating the tightened unique
index would fail on those rows. `DISTINCT ON (campaign_id, asset_id)` keeps one
row per asset, preferring `inline` over `attachment`, then lowest id.

**`header` rows are folded into `inline` before the type swap.** Postgres has no
`ALTER TYPE ... DROP VALUE`, so the enum is replaced via a new type and a cast
through text. That cast errors while any row still holds `header`. The
alternative — leaving it to fail and letting an operator decide per row — turns
a routine migration into an outage during an event.

Both steps are no-ops on an empty table, which is the likely state, since no UI
has ever written a binding. They are there so the migration is safe either way,
because the row count cannot be checked from the app.

`created_at` is stamped at migration time for existing rows. That is the closest
honest value, and it only serves as a tiebreak among attachments, where every
pre-existing row legitimately ties with every other.

## Write Path

`app/lib/services/campaign-service.ts`, new. House style: `import "server-only"`,
`getPrismaClient()`, destructured-parameter exports, named types not exported
unless a caller needs them.

- `bindCampaignAsset` — upserts on the composite unique. Re-binding an asset
  under a different role updates rather than colliding, and because `update` only
  sets `role`, the binding id and `created_at` survive, which keeps attachment
  ordering stable when an operator changes a role instead of re-adding a file.
- `bindCampaignAssets` — the same in one `$transaction`, so a campaign cannot end
  up with half an asset set applied. The campaign id is taken from the argument
  rather than from each entry, so a mismatched entry cannot attach an asset to a
  different campaign.
- `listCampaignAssets` — returns inline and attachment assets, flattened from the
  `asset` relation so callers do not each re-implement the join.
- `unbindCampaignAsset` — `deleteMany` scoped to the campaign, so unbinding is
  not a way to delete a shared asset.

Ordering encodes the #90 decision directly: grouped by role, then
`asset.originalFilename`, then `created_at`. Inline order is left to the renderer
because it comes from the Markdown AST; attachments have no intrinsic order, so
filename plus `created_at` makes the list deterministic.

## Tests

`app/tests/lib/services/campaign-service.test.ts`, 6 cases, mocking
`getPrismaClient` the way `attendee-service.test.ts` does.

Beyond the happy paths, two cases pin decisions that are easy to regress:
changing a role must not move `created_at`, and a mismatched `campaignId` inside
a batch must not attach the asset elsewhere.

`pnpm test` passed while `pnpm build` failed: the fixtures used a `2048n` BigInt
literal and the build's TypeScript target is below ES2020. Changed to
`BigInt(2048)`, matching `asset-service.ts`. Run both.

## Non-Goals

- No API route. The route is TSK-0609's preview endpoint and the campaign
  composer wiring; this task owns the model and the write path.
- Removing `app/app/(auth)/register/page.tsx`.
- Reconciling the 14 pre-existing stale TSK rows or the 47 reverse-matrix rows.
  Only the TSK-0608 row is flipped here; DMA-13's reverse row is not, per the
  one-row-per-PR rule.

## Acceptance Criteria

- `prisma validate` and `prisma generate` succeed.
- The schema has no `position`, no `HEADER`, a `created_at`, and
  `@@unique([campaignId, assetId])`.
- The migration matches the schema, so `prisma migrate status` reports no drift.
- A campaign can bind an asset, read it back, change its role, and unbind it.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.
- TSK-0608 marked `[x] Completed` in `docs/traceability-matrix.md`.

## Verification Gap

The migration was validated against Prisma's generated SQL and `prisma validate`,
but **not applied to a database**: there is no test or shadow database configured
locally, and the only connection available is the development Neon branch, which
this should not be run against by accident. Before merge, run
`prisma migrate deploy` against a scratch branch and confirm
`prisma migrate status` reports no pending change.
