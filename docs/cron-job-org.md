# Event Closure Scheduler

Configure this after deploying the app. The scheduler is intentionally outside the application so the secret never reaches the browser or source control.

1. Create a cron-job.org job that runs every five minutes.
2. Use `POST` with the deployed URL: `https://<app-host>/api/cron/close-events`.
3. Add the request header `X-Cron-Secret` with the same value as the production `CRON_SECRET` environment variable.
4. Leave request body empty and save the job.
5. Trigger one manual run and confirm it returns JSON with `closedEventCount` and `absentEntryCount`.

The endpoint returns `401` for a missing or invalid secret. Rotate `CRON_SECRET` in the app and scheduler together.

# Email Queue Worker

Campaign emails are queued when a campaign is created. Nothing is sent until the queue worker runs. Three cron-job.org jobs run it each night.

| Job | Time (organization timezone) | Purpose |
|---|---|---|
| `email-queue-0200` | 02:00 | Sends everything queued, up to 300 emails, which is the Brevo free-plan daily allowance (`BREVO_DAILY_LIMIT`). |
| `email-queue-0210` | 02:10 | Retries sends that failed in the 02:00 run. |
| `email-queue-0220` | 02:20 | Retries sends that failed in the 02:10 run. |

Set the cron-job.org timezone to `Asia/Manila`, or whatever `ORGANIZATION_TIMEZONE` is. The daily allowance resets at midnight in that timezone, so every run must be after midnight there.

## Setup

For each of the three jobs:

1. Use `POST` with the deployed URL: `https://<app-host>/api/internal/queue-worker`.
2. Add the request header `X-Queue-Worker-Secret` with the same value as the production `QUEUE_WORKER_SECRET` environment variable.
3. Leave the request body empty. A run with no body sends up to 300 emails.
4. Optional: to tell the runs apart when debugging, send `Content-Type: application/json` and a body such as `{"workerId": "email-queue-0200"}`. The name is written to `queue_jobs.locked_by`, so a stuck job shows which run claimed it. Without it, every run is labelled `queue-worker`, which is safe because the runs never overlap.
5. Set the cron-job.org request timeout to its maximum. A run can take up to five minutes.
6. Save the job, then trigger one manual run. It should return JSON with `claimed`, `completed`, `retried`, `deadLettered` and `held`.

For a smaller manual test, send `{"limit": 10}` with `Content-Type: application/json`.

## How a run behaves

- **Five minutes at most.** The route sets `maxDuration = 300`. It stops claiming new work after four minutes so the last batch can finish. Each Brevo request times out after 20 seconds.
- **Five emails at once.** Jobs are claimed ten at a time, each batch with its own five-minute lease, and sent five at a time.
- **Failed sends wait five minutes.** The run that failed them does not retry them; the next run does. That is why the runs are ten minutes apart: a run lasts at most five minutes, then the failed sends become claimable.
- **Retries:** a send can fail four times before it is dead-lettered (`max_retries = 3`). The three nightly runs give three attempts. A send that fails all three waits for the next night's 02:00 run, which is its last try. Dead-lettered emails can be retried from the campaign page.
- **Quota:** once the day's allowance is spent, the remaining emails are held without using up retries, and go out the next night. A run that finds the allowance already spent returns at once without claiming anything.
- **Run overlap:** runs must stay ten minutes apart. If one is cut off, the jobs it left claimed are released when their five-minute lease expires, and the next run picks them up.

## What to accept

- Campaigns created during the day go out after 02:00 that night. Same-day events need a manual run (step 6 above) instead.
- More than 300 recipients take more than one night.

Rotate `QUEUE_WORKER_SECRET` in the app and in all three jobs together.
