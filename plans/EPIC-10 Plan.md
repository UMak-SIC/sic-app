## Goal

Deliver the compliance and verification layer for the SIC admin app: a scheduled five-year cleanup, deterministic cloud-service fakes that keep automated tests offline and credentials server-only, and a Playwright admin-workflow test that proves the complete event-to-attendance path.

## Source Of Truth

- GitHub epic [#63: EPIC-10 Security, Retention & End-to-End Verification](https://github.com/UMak-SIC/sic-app/issues/63)
- GitHub child issue [#51: TSK-1001 five-year data retention policy](https://github.com/UMak-SIC/sic-app/issues/51)
- GitHub child issue [#52: TSK-1002 deterministic cloud-service test fakes](https://github.com/UMak-SIC/sic-app/issues/52)
- GitHub child issue [#53: TSK-1003 full admin workflow E2E suite](https://github.com/UMak-SIC/sic-app/issues/53)
- `docs/traceability-matrix.md` (EPIC-10, DMA-12, and NFR-04)
- `CONTEXT.md` (Admin, Attendee, Event Roster Entry, Campaign, and Delivery definitions)

## Non-Goals

- Changing the Neon Managed Better Auth production configuration or moving credentials into browser code.
- Creating a second production email, storage, or identity-provider implementation solely for tests.
- Replacing focused unit and integration tests with the E2E suite.
- Retaining an E2E authentication bypass in a production build or deployment.

## Execution Order

## PR Stacking Strategy

```
dev
├── feat/tsk-1001-data-retention
├── feat/tsk-1002-test-fakes
└── feat/tsk-1003-admin-workflow-e2e
    └── requires merged EPIC-04 through EPIC-09 workflow slices
```

Create #51 and #52 independently from `dev` and target their pull requests at `dev`. Create #53 from `dev` only after its prerequisite routes and UI flows have merged to `dev`; do not stack it on unmerged feature branches, since it is the integration proof for their merged contract.

## Linear Sub-Issue Tracking

No Linear project is configured. GitHub epic #63 already owns the three implementation children: #51 retention, #52 test fakes and credential-isolation coverage, and #53 end-to-end verification.

GitHub records no explicit `blockedBy` or `blocking` links on #63, #51, #52, or #53. The implementation dependencies below are inferred from the traceability matrix and are all currently open: #22-#23 (event creation and UI), #26-#29 (attendee validation and ingestion), #31-#34 (email and QR), #36-#43 (queue and campaign submission), and #46-#50 (scanner, check-in, attendance export).

### 1. Implement scheduled five-year retention cleanup (#51)

- Add `app/lib/services/retention-service.ts`, `app/app/api/cron/retention/route.ts`, and targeted tests under `app/tests/lib/services/` and `app/tests/app/api/cron/`; inject the current time so the five-year cutoff and boundary behavior are deterministic.
- Delete delivery records and their dependent queue jobs and delivery attempts before deleting their roster entries and attendees, or anonymize only where the final foreign-key policy requires historical rows to remain; perform the cleanup transactionally so no personally identifiable orphan remains. Protect the cron endpoint with a dedicated high-entropy server-only secret, document that secret in `app/.env.example`, and never expose it through `NEXT_PUBLIC_` variables.

### 2. Establish deterministic provider fakes and credential-isolation coverage (#52)

- Add recording, deterministic fakes in `app/tests/fakes/` for Neon Auth sessions, Mailgun, Brevo, and Neon Object Storage; include fixtures for unauthenticated, authenticated non-admin, and allowlisted-admin sessions plus explicit sent-object and sent-message assertions.
- Extract or standardize narrow adapter seams at `app/lib/auth/server.ts`, `app/lib/storage/neon-storage-client.ts`, and the provider modules delivered by #38 and #39 so unit, route, and worker tests consume a fake without resolving cloud environment variables; retain lazy production-client creation and add tests proving required credentials are absent from browser-facing modules and test runs remain offline.

### 3. Build the admin workflow E2E suite after prerequisite slices merge (#53)

- Add `app/tests/e2e/workflow.spec.ts` and update `app/playwright.config.ts` with an isolated test server configuration that selects the #52 test adapters at build/start time, never as a runtime production bypass; add any test-only config and fixtures under `app/tests/e2e/`.
- Cover one administrator journey: establish a fake allowlisted session, create and publish an event, import recipients, compose and submit a campaign, assert queued delivery through fake providers, scan the generated QR ticket, then verify and download the attendance CSV. Keep the suite serial and deterministic, seed only an isolated test database, and assert unauthenticated/non-admin cases remain rejected at the relevant route boundaries.

### 4. Verify cross-cutting contracts and update delivery evidence

- Update `docs/traceability-matrix.md` only when the corresponding child issue's acceptance checks have passed; preserve individual task status so the epic does not appear complete before the prerequisite workflow exists.
- From `app/`, run `pnpm db:validate`, focused Vitest suites, the complete `pnpm test` suite without cloud credentials, and `pnpm test:e2e` against the test-only harness; add a credential scan of client bundles or import boundaries as part of the #52/#53 CI verification.

## Acceptance Criteria

- The authenticated retention endpoint applies a precisely tested five-year cutoff and removes or irreversibly anonymizes attendee and delivery personal data in a transaction.
- Retention scheduling credentials, Neon Auth credentials, storage keys, and provider keys remain server-only and are absent from browser-facing code.
- The default unit and integration test harness runs without live Neon Auth, Mailgun, Brevo, or Neon Object Storage credentials and covers anonymous, non-admin, and admin sessions deterministically.
- The full Playwright workflow executes event publication, recipient import, campaign submission, QR check-in, and attendance CSV export using only isolated test infrastructure.
- E2E test adapters cannot be enabled in a production build or deployment.
- From `app/`, `pnpm db:validate`, `pnpm test`, and `pnpm test:e2e` pass at the appropriate child-issue completion points.
