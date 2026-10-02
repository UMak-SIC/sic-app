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
 * Brevo delivery over its transactional HTTP API.
 *
 * Brevo is the primary provider. It answers 201 with a `messageId`, and 4xx
 * with `{ code, message }`.
 *
 * Delivery uses HTTPS from the queue worker; no SMTP relay runs in this app.
 *
 * Endpoints:
 * - https://developers.brevo.com/reference/sendtransacemail
 */

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

function validateMessage(message: { to: string; fromEmail: string; subject: string; html: string }): void {
  if (!message.to.trim()) {
    throw new Error("The message has no recipient address.");
  }

  if (!message.fromEmail.trim()) {
    throw new Error("BREVO_FROM_EMAIL is required to send email.");
  }

  if (!message.subject.trim()) {
    throw new Error("The message has no subject line.");
  }

  if (!message.html.trim()) {
    throw new Error("The message has no HTML body.");
  }
}

export async function dispatchViaBrevo(
  job: ClaimedQueueJob,
  provider: EmailProvider,
  deps: ProviderDispatchDeps
): Promise<ProviderDispatchResult> {
  const env = deps.env ?? process.env;
  const doFetch = deps.fetchImpl ?? fetch;

  let apiKey: string;
  let fromEmail: string;

  try {
    apiKey = requiredEnvironment("BREVO_API_KEY", env);
    fromEmail = requiredEnvironment("BREVO_FROM_EMAIL", env);
  } catch (error) {
    return toFailure(error);
  }

  const message = await deps.resolveMessage(job);
  const fromName = env.BREVO_FROM_NAME?.trim();

  const payload = {
    sender: { email: fromEmail, ...(fromName ? { name: fromName } : {}) },
    to: [{ email: message.to }],
    subject: message.subject,
    htmlContent: message.html,
    ...(message.text ? { textContent: message.text } : {}),
    ...(message.replyTo ? { replyTo: { email: message.replyTo } } : {}),
    ...(message.attachments?.length ? { attachment: message.attachments } : {}),
  };

  let response: Response;

  try {
    validateMessage({
      to: message.to,
      fromEmail,
      subject: message.subject,
      html: message.html,
    });

    response = await doFetch(BREVO_SEND_URL, {
      method: "POST",
      headers: {
        // Brevo authenticates with a bare `api-key` header, not Basic auth.
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return toFailure(error);
  }

  const responseBody = await readBody(response);

  if (!response.ok) {
    return {
      succeeded: false,
      httpStatus: response.status,
      errorMessage: describeBrevoFailure(response.status, responseBody),
      requestPayload: toLoggablePayload({ to: message.to, subject: message.subject }),
      responsePayload: toLoggablePayload(responseBody),
    };
  }

  return {
    succeeded: true,
    providerMessageId:
      typeof responseBody?.messageId === "string" ? responseBody.messageId : undefined,
    httpStatus: response.status,
    requestPayload: toLoggablePayload({ to: message.to, subject: message.subject }),
    responsePayload: toLoggablePayload(responseBody),
  };
}

/**
 * Brevo returns 401 for a bad key and 400 with a `code` such as
 * `invalid_parameter` or `document_not_found` for a rejected payload. The
 * failover engine needs the status more than the prose, so the message names the
 * cause without echoing the whole response.
 */
function describeBrevoFailure(status: number, body: unknown): string {
  const detail =
    body && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message
      : undefined;

  const prefix =
    status === 401 || status === 403
      ? "Brevo rejected the API key."
      : status === 429
        ? "Brevo is rate limiting this account."
        : status >= 500
          ? "Brevo had a server error."
          : "Brevo rejected the message.";

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
