## Goal

Carry out the decision recorded on #110: `{{venue}}` comes from the event, and
the create-event form gains a venue field.

## Source Of Truth

- Decision: [#110](https://github.com/UMak-SIC/sic-app/issues/110) comment by
  `CharlesTogle` — "{{venue}} needs to come from the event / extend create event
  form to add venue"
- `app/lib/queue/delivery-message.ts` (the resolver, in #106)
- `app/components/campaign/campaign-composer-step.tsx`, `campaign-assets-step.tsx`
- `app/lib/services/event-service.ts`

## What this does

`events.venue` — nullable free text, so it can hold a building, a room, or a
meeting link. Threaded through the service, both events routes, and the form.
Migration `20261001010000_add_event_venue` generated with `prisma migrate diff`.

The form field is optional and hints that leaving it blank is fine for an online
event. An empty input is submitted as `null`, and the service stores `"   "` as
`null` too, so a venue reads cleanly in an email and a blank one is
indistinguishable from a venue nobody typed.

**The composer's preview no longer hardcodes a room.** `campaign-assets-step.tsx`
replaced `{{venue}}` with the literal string `"Audio Visual Room"` — a
hardcoded value that would have disagreed with every real event. It now reads the
event's own venue and drops the token when there is none, which is the same
substitution the delivery resolver performs, so the preview cannot promise a
venue that a real send omits.

## What this does not do, and why

The #110 comment had a second instruction: *"in the composer, add only
interpolation options such as `{{name}} {{section}} {{venue}} {{event_date}}`"*.
That is **not** implemented here, because it cannot be done without two decisions
that have not been made.

**The example names do not match the existing set.** The composer offers
`{{student_name}}`, `{{event_name}}`, `{{event_time}}`; the comment names
`{{name}}`, `{{venue}}`, `{{event_date}}`. Renaming is a breaking change to every
saved campaign body. It is cheap *now* only because no real campaign has been
saved — every body is still seed data — so this is the moment to decide it.

**`{{section}}` has no source.** Nothing in the schema has a section. If it means
a student's section (as in `BSIT-2A`) it needs a new `Attendee` column, which is
a #109-style decision. If it means something about the event, that is also
unmodelled.

**`{{qr_ticket_pass}}` is offered but unresolvable.** The composer lists it as an
easy insert and the preview blanks it to `""`, and the delivery resolver strips
it as an unknown token — because `qr-image-generator` still has no caller. So the
composer currently offers an option that produces nothing. That is true today and
is not fixed here; it is the clearest evidence for the "only options that
resolve" instruction.

## Tests

289 total, 7 new: venue trimming and whitespace collapsing, a blank venue stored
as null, an omitted venue stored as null, an over-long venue rejected, and the
route sending a missing venue as null.

## Non-Goals

- **The token set.** Blocked on the naming and `{{section}}` questions above.
- **Wiring the composer to a real campaign.** There are no campaign routes yet.
- **The QR pass in campaign email.** Still unbuilt.
- **A course/section report.** Not requested.

## Acceptance Criteria

- `Event` carries a nullable `venue`, with a generated migration.
- The create and edit forms accept a venue and prefill it when editing.
- An empty or whitespace-only venue is stored as `null`.
- A venue over 120 characters is rejected before persistence.
- Both events routes accept and forward the field, rejecting a non-string value.
- The composer preview substitutes the event's own venue instead of a hardcoded
  room, and drops the token when there is none.
- `pnpm test`, `pnpm lint` (38 pre-existing warnings, unchanged) and `pnpm build`
  pass.
