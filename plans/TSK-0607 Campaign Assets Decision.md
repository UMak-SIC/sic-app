## Goal

Record the maintainer decisions taken on #88 and #90, the corrected data-model
contract that follows from them, and the remaining implementation work they leave
behind.

Decided 2026-09-30. This file is the durable record; the issues carry the
discussion.

## Source Of Truth

- GitHub child issue [#88: TSK-0506 student_id policy](https://github.com/UMak-SIC/sic-app/issues/88)
- GitHub child issue [#90: TSK-0607 define campaign_assets](https://github.com/UMak-SIC/sic-app/issues/90)
- `docs/traceability-matrix.md` (DMA-02, DMA-11, DMA-13, and the Data Model Detail section)
- Epics [#58](https://github.com/UMak-SIC/sic-app/issues/58) and [#59](https://github.com/UMak-SIC/sic-app/issues/59)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider traceability
matrix are historical/derived context, not decision inputs.

## Non-Goals

- Implementing the schema migration or the binding write path. TSK-0608.
- The composer preview that will consume the model. TSK-0604.
- TSK-0505, now unblocked but still UI work.

## Decision 1 — `student_id` stays required, and paste resolves only against existing attendees

`attendees.student_id` remains `NOT NULL` and globally unique. **DMA-02 is not
amended.**

- CSV import is the only path that creates an attendee. A new row carries a valid
  `student_id` and a full name.
- Pasted input resolves exclusively against existing `attendees` rows.
- A pasted address matching no existing attendee is rejected with: *"Attendee not
  found. New attendees must be enrolled via CSV with a valid student ID and full
  name."*
- Rejection is per row, matching the row-level error surface TSK-0502 provides.

### What this changes in code

`applyAttendeeImport` already reports `missing_student_id` as unapplied, so the
behaviour exists. Two things still need to change, neither in this decision:

1. **A row missing a `name` must also be rejected.** The current code falls back
   to the display email for the required `name` column. The error message promises
   a full name, so silently substituting an address would contradict it. TSK-0608
   or a follow-up owns this.
2. **The paste path must resolve against existing attendees explicitly.**
   `parsePastedRecipients` currently returns records with `studentId: null` and
   leaves resolution to the conflict preview, which matches on `student_id` **or**
   `normalizedEmail`. That already produces the required behaviour, since an
   unmatched paste becomes a create attempt and is then rejected for a missing
   student ID. The improvement is the error message and surfacing it earlier, not a
   new code path.

Worth stating: this decision makes TSK-0505's existing scope, "filtering prior
event attendees", exactly right. The selector filters existing records by design,
so no scope change is needed there.

## Decision 2 — A QR ticket image is not a campaign asset

Per-recipient HMAC QR ticket images are generated at queue dispatch time and
inlined as a MIME part. They create no `assets` row and no `campaign_assets` row.

This costs nothing. TSK-0603 already derives the Content-ID from the signed
ticket, so the CID is **computed, not stored**, and cannot drift between a
preview and the sent message. Nothing needs to be undone.

## Decision 3 — The `header` role is removed

A Markdown body has no header concept, and a Markdown-first composer should not
grow one. The campaign carries a subject; the event carries the banner.

## Corrected DMA-13

The spec as first drafted had five defects. All are corrected in the
`Data Model Detail` section of the matrix.

| # | Defect | Correction |
| :-- | :--- | :--- |
| 1 | Cited `events.banner_asset_id` | The column is `events.image_asset_id` |
| 2 | `PRIMARY KEY (campaign_id, asset_id)` omitted the surrogate `id` | Surrogate `id` retained; uniqueness is a composite `UNIQUE`. Both columns are already NOT NULL so the constraint behaves identically, without a primary-key type change on an existing table |
| 3 | Silently forbade an asset being both `inline` and `attachment` on one campaign | Kept as intended, and stated explicitly as a deliberate tightening of the previous `UNIQUE (campaign_id, asset_id, role)` |
| 4 | Attachment ordering said "or" | Alphabetical by `assets.original_filename`, with `created_at` as tiebreak. A recipient reads an attachment list in name order, and this is deterministic without a stored column |
| 5 | CID example `cid:qr-ticket` did not match the code | The matrix records that the CID is derived from the signed ticket rather than fixing a literal, so docs cannot drift from TSK-0603 |

## Remaining work

**TSK-0608 — apply the DMA-13 schema changes and implement the binding write path.**
Added to the matrix with this decision. It owns:

- Drop `header` from the `CampaignAssetRole` enum
- Drop `campaign_assets.position`
- Add `campaign_assets.created_at`
- Replace `UNIQUE (campaign_id, asset_id, role)` with `UNIQUE (campaign_id, asset_id)`
- Add the write and read path for binding campaign assets, and ordering derived
  from the Markdown source for `inline` and from `original_filename` for
  `attachment`

No data backfill is needed. Nothing has ever written `campaign_assets` rows,
because no task owned binding an asset to a campaign until TSK-0607. The
migration is therefore a schema change against an empty table.

**TSK-0604 — composer preview.** Unblocked by this decision and can now be built
against a defined attachment model.

**TSK-0505 — recipient selector.** Unblocked, and its scope already matches.

## Still open, not blocked by anything

[#89: TSK-0606](https://github.com/UMak-SIC/sic-app/issues/89) QR secret rotation
and [#91: TSK-0105](https://github.com/UMak-SIC/sic-app/issues/91) the
`neon.ts` preview function. Both need a maintainer decision but gate no code, so
they can sit indefinitely.
