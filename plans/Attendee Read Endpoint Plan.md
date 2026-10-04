## Goal

Give the attendee registry a read path. EPIC-05 had a write path and no read
path, so the directory page and the past-attendee recipient selector had nothing
to call.

## Source Of Truth

- GitHub issue [#107: Add GET /api/attendees directory read endpoint](https://github.com/UMak-SIC/sic-app/issues/107)
- GitHub issue [#30: TSK-0505 Build past attendee recipient selector](https://github.com/UMak-SIC/sic-app/issues/30)
- GitHub epic [#58: EPIC-05 Attendee Registry & Recipient Ingestion Engine](https://github.com/UMak-SIC/sic-app/issues/58)
- `docs/traceability-matrix.md` (US-08, TSK-0501 through TSK-0507, DMA-02)
- `app/lib/services/attendance-service.ts` (the existing search convention)
- `app/lib/services/attendee-service.ts` (the write side, unchanged here)
- `app/app/(tabs)/attendees/page.tsx` (the `AttendeeItem` shape the UI expects)

## The gap

A caller audit on `dev` found no read endpoint for attendees. The only
`emailDelivery`-adjacent attendee writes go through the import path
(`attendee-service.ts`, TSK-0507). Nothing served attendee rows, so:

- The directory table renders `INITIAL_DIRECTORY_DATA` — hardcoded seed rows.
- TSK-0505 has no data source for its selector.

`attendee-service.ts` stays the write side. A separate
`attendee-directory-service.ts` holds the read, so nothing here writes and the
import path does not grow a dependency on listing.

## The shape

Each attendee returns `id`, `name`, `studentId`, `email`, `joinedDate`,
`events[]` with an `attended` flag, plus `totalEventsJoined`,
`attendedEventsCount` and `attendanceRate`. The rates are derived from roster
entries so the table holds no computed state of its own.

`email` is `displayEmail`, not `normalizedEmail`: DMA-02 keeps the normalised
form for matching and the display form for what a human sees.

The organization timezone rides along with the payload, the same way
`/api/events` returns it, so the client formats dates identically wherever it
renders them.

## Three fields the UI wants and the schema cannot supply

The directory's `AttendeeItem` shape also carries `course`, `program`, and a
per-event `shortCode`. **No column holds any of them** — `Attendee` has no
`course` or `program`, and `Event` has no `short_code`.

They are omitted rather than returned empty. A blank cell is worse than a missing
field: an administrator cannot tell `course: ""` apart from a student who
genuinely has nothing recorded. This is the third schema/UI mismatch in this
codebase, after `course`/`program` on attendees and `{{venue}}` on campaigns, and
it still needs a decision.

A test pins the omission, so adding these fields later is a deliberate change
rather than an accident.

## Search matches the existing convention

`getEventAttendance` already searches `name`, `displayEmail` and `studentId` with
`contains` and `mode: "insensitive"`. The directory uses the same three fields
the same way, so the same query finds the same people in either place.

## `attendedOnly` is the past-attendee source

US-08 is "select past attendees as recipients". The filter is attendees with at
least one `ATTENDED` roster entry.

**No date filter is applied.** "Previous" is a product decision and the schema
does not imply one. In practice `ATTENDED` already means past, because nobody is
marked present at an event that has not happened. If the product wants a
different reading — "before this date", say — that is a filter to add, and it
belongs to TSK-0505 rather than here.

## Validation is hand-rolled

`page`, `pageSize`, `q` and `attendedOnly` reject nonsense with 400 rather than
coercing it. No zod: this is four scalar parameters and a shared secret check,
which is not a reason to add a validation library to the bundle.

`pageSize` is capped at 100 so one request cannot read the whole registry, and `q`
is bounded at 200 characters so a pasted paragraph does not become an unbounded
scan.

## Two defects the tests caught

- **`listAttendees()` threw when called with no argument.** The destructured
  parameter had no default, so the function was a footgun even though every
  current caller passes an object.
- **`?q=` behaved differently from `?page=` and `?attendedOnly=`.** The route
  used `?? undefined`, which does not catch an empty string, so an empty search
  arrived as `""` while the other two were treated as absent. All four now treat
  empty as absent.

`pnpm build` also caught a `Promise.all` overload error in the test mock that
`pnpm test` did not — the usual reason both are run.

## Tests

28 new cases: 14 on the service (shape, the three omitted fields, the rate
arithmetic including empty-roster and full-attendance cases, search filter,
`attendedOnly`, both orderings, pagination, `totalPages` for an empty registry,
and that the page and count are read together) and 14 on the route (401, 403,
timezone, defaults, each parameter, every rejected branch, empty-means-absent,
and plain-language errors).

## Matrix Changes

No task row flips — this delivers an enabling issue, not a numbered task.
TSK-0505 and US-08 stay `[ ] Planned` until the selector exists. A note under the
EPIC-05 table records #107, what it serves, and the three omitted fields.

## Non-Goals

- **The recipient selector.** TSK-0505, #30. This is only its data source.
- **Adding `course`, `program` or `short_code`.** A schema decision.
- **Wiring the directory page to it.** The page's shape still expects the three
  omitted fields, so wiring it is a UI change that follows the schema decision.
- **Campaign routes**, so a selection has somewhere to go.
- Reconciling the pre-existing stale rows elsewhere in the matrix.

## Acceptance Criteria

- An unauthenticated request returns 401 and a signed-in non-administrator 403,
  with nothing listed in either case.
- The response carries the directory shape, the derived rates, `pagination` and
  `timezone`.
- `email` is the display form, not the normalised one (DMA-02).
- An attendee on no roster reports a rate of 0; an empty registry reports one page.
- A partial rate is a whole percent.
- `attendedOnly=true` returns only people marked present at least once.
- Every parameter rejects nonsense with 400, treats empty as absent, and caps
  `pageSize` at 100 and `q` at 200 characters.
- No `course`, `program` or `shortCode` key appears.
- `pnpm test`, `pnpm lint` and `pnpm build` pass, and the route appears in the
  build's route table.
