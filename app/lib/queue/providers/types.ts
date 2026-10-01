import type { EmailProvider } from "@prisma/client";

import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";
import type { DeliveryAttemptResult } from "@/lib/queue/delivery-logger";

/**
 * The provider transport contract shared by every adapter.
 *
 * These adapters are transport only. They take a message that is already
 * composed and hand it to a provider's HTTP API, then normalise the outcome so
 * every attempt reaches the same delivery logger. Composing the message —
 * substituting recipient attributes, compiling the Markdown body, minting the QR
 * ticket — belongs to the campaign and delivery work, not here.
 */

/** A single outbound message, already rendered and addressed. */
export type OutboundMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: { name: string; content: string }[];
};

/**
 * Resolves the message for a claimed job. Injected because rendering the body is
 * not this layer's job, and because tests need to supply a message without a
 * database.
 */
export type ResolveMessage = (job: ClaimedQueueJob) => Promise<OutboundMessage>;

export type ProviderDispatchDeps = {
  resolveMessage: ResolveMessage;
  /** Injectable for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests. Defaults to `process.env`. */
  env?: Record<string, string | undefined>;
};

/** What an adapter returns: the shared attempt shape minus the provider, which the caller supplies. */
export type ProviderDispatchResult = Omit<DeliveryAttemptResult, "provider">;

/**
 * A single adapter. Takes the dependencies explicitly so a test can supply a
 * message, a fetch, and an environment without touching the module scope.
 */
export type ProviderAdapter = (
  job: ClaimedQueueJob,
  provider: EmailProvider,
  deps: ProviderDispatchDeps
) => Promise<ProviderDispatchResult>;

/**
 * The shape `processQueueJobs` expects for its `dispatch` argument: the provider
 * is supplied by the queue, and the dependencies are already bound.
 */
export type ProviderDispatch = (
  job: ClaimedQueueJob,
  provider: EmailProvider
) => Promise<ProviderDispatchResult>;

/**
 * Mirrors the `requiredAuthEnvironment` pattern in `app/lib/auth/server.ts`: a
 * missing variable is a configuration error and should stop the deployment
 * loudly rather than silently sending from nowhere.
 */
export function requiredEnvironment(
  name: string,
  env: Record<string, string | undefined>
): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to send email.`);
  }

  return value;
}

/**
 * Turns a thrown fetch or a non-2xx response into a normalised failed attempt.
 *
 * Adapters never throw for a delivery failure. `processQueueJobs` treats a throw
 * as a generic dispatch error and loses the provider's own status and message,
 * which are exactly what an operator needs to tell a bad API key apart from a
 * rejected recipient.
 */
export function toFailure(
  error: unknown,
  extras: Partial<ProviderDispatchResult> = {}
): ProviderDispatchResult {
  return {
    succeeded: false,
    errorMessage: error instanceof Error ? error.message : "Provider dispatch failed.",
    ...extras,
  };
}

/** Reduces an arbitrary parsed body to something JSON-serialisable for the attempt log. */
export function toLoggablePayload(value: unknown): ProviderDispatchResult["responsePayload"] {
  if (value === undefined) {
    return undefined;
  }

  try {
    JSON.parse(JSON.stringify(value));
    return value as ProviderDispatchResult["responsePayload"];
  } catch {
    return { unloggable: String(value) };
  }
}
