import type { EmailProvider } from "@prisma/client";

import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";

import {
  requiredEnvironment,
  toFailure,
  toLoggablePayload,
  type ProviderDispatchDeps,
  type ProviderDispatchResult,
} from "./types";

/**
 * Mailgun delivery over its HTTP API (TSK-0703, US-21, NFR-02).
 *
 * Mailgun's messages endpoint takes `application/x-www-form-urlencoded` and
 * authenticates with HTTP Basic as `api:<key>`. There is no SMTP involved: the
 * queue worker is a Next.js process, not a mail relay, so opening an SMTP socket
 * would mean running a relay inside the app.
 *
 * Endpoints:
 * - https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages
 */

const MAILGUN_API_BASE = "https://api.mailgun.net/v3";

function messagesUrl(domain: string): string {
  return `${MAILGUN_API_BASE}/${encodeURIComponent(domain)}/messages`;
}

/** Mailgun rejects an empty `to` or a malformed `from` with a 400, so both are checked here. */
function validateMessage(message: {
  to: string;
  from: string;
  subject: string;
  html: string;
}): void {
  if (!message.to.trim()) {
    throw new Error("The message has no recipient address.");
  }

  if (!message.from.trim()) {
    throw new Error("MAILGUN_FROM is required to send email.");
  }

  if (!message.subject.trim()) {
    throw new Error("The message has no subject line.");
  }

  if (!message.html.trim()) {
    throw new Error("The message has no HTML body.");
  }
}

export async function dispatchViaMailgun(
  job: ClaimedQueueJob,
  provider: EmailProvider,
  deps: ProviderDispatchDeps
): Promise<ProviderDispatchResult> {
  const env = deps.env ?? process.env;
  const doFetch = deps.fetchImpl ?? fetch;

  let apiKey: string;
  let domain: string;
  let from: string;

  try {
    apiKey = requiredEnvironment("MAILGUN_API_KEY", env);
    domain = requiredEnvironment("MAILGUN_DOMAIN", env);
    from = requiredEnvironment("MAILGUN_FROM", env);
  } catch (error) {
    return toFailure(error);
  }

  const message = await deps.resolveMessage(job);

  // Mailgun caps a tag at 3 characters, so the caller's longer tags are reduced
  // rather than sent and rejected.
  const tags = (message.tags ?? []).map((tag) => tag.slice(0, 3));

  const form = new URLSearchParams({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
  });

  if (message.text) {
    form.set("text", message.text);
  }

  if (message.replyTo) {
    form.set("h:Reply-To", message.replyTo);
  }

  for (const tag of tags) {
    form.append("o:tag", tag);
  }

  let response: Response;

  try {
    validateMessage({ to: message.to, from, subject: message.subject, html: message.html });

    response = await doFetch(messagesUrl(domain), {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
  } catch (error) {
    return toFailure(error);
  }

  const responseBody = await readBody(response);

  if (!response.ok) {
    return {
      succeeded: false,
      httpStatus: response.status,
      errorMessage: describeMailgunFailure(response.status, responseBody),
      requestPayload: toLoggablePayload({ to: message.to, subject: message.subject, tags }),
      responsePayload: toLoggablePayload(responseBody),
    };
  }

  return {
    succeeded: true,
    // Mailgun returns the message id under `id`, as a bare string.
    providerMessageId: typeof responseBody?.id === "string" ? responseBody.id : undefined,
    httpStatus: response.status,
    requestPayload: toLoggablePayload({ to: message.to, subject: message.subject, tags }),
    responsePayload: toLoggablePayload(responseBody),
  };
}

/**
 * Mailgun answers 200 with `{ id, message }` on success and 4xx with a
 * `{ message }` string. A 401 is a bad key, a 400 a rejected payload; both need
 * to be distinguishable to an operator, and neither should surface the raw body.
 */
function describeMailgunFailure(status: number, body: unknown): string {
  const detail =
    body && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message
      : undefined;

  const prefix =
    status === 401 || status === 403
      ? "Mailgun rejected the API key."
      : status === 429
        ? "Mailgun is rate limiting this account."
        : status >= 500
          ? "Mailgun had a server error."
          : "Mailgun rejected the message.";

  return detail ? `${prefix} ${detail}` : prefix;
}

async function readBody(response: Response): Promise<Record<string, unknown> | undefined> {
  const text = await response.text().catch(() => "");

  if (!text) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
