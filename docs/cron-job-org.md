# Event Closure Scheduler

Configure this after deploying the app. The scheduler is intentionally outside the application so the secret never reaches the browser or source control.

1. Create a cron-job.org job that runs every five minutes.
2. Use `POST` with the deployed URL: `https://<app-host>/api/cron/close-events`.
3. Add the request header `X-Cron-Secret` with the same value as the production `CRON_SECRET` environment variable.
4. Leave request body empty and save the job.
5. Trigger one manual run and confirm it returns JSON with `closedEventCount` and `absentEntryCount`.

The endpoint returns `401` for a missing or invalid secret. Rotate `CRON_SECRET` in the app and scheduler together.
