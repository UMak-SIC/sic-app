import "server-only";

import { EmailProvider } from "@prisma/client";

import { dispatchViaBrevo } from "./brevo";
import type { ProviderAdapter, ProviderDispatch, ProviderDispatchDeps } from "./types";

export type {
  OutboundMessage,
  ProviderAdapter,
  ProviderDispatch,
  ProviderDispatchDeps,
  ResolveMessage,
} from "./types";

const adapters: Record<EmailProvider, ProviderAdapter> = {
  [EmailProvider.BREVO]: dispatchViaBrevo,
};

/**
 * Builds the `dispatch` function for `processQueueJobs`, binding the message
 * resolver and transport up front.
 *
 * `processQueueJobs` takes `dispatch` by injection and calls it with the job and
 * the provider the queue reserved, so the returned function takes
 * exactly those two arguments. Nothing wires this up yet; it exists so the worker
 * and the test-send route share one entry point rather than each switching on the
 * provider themselves.
 */
export function createProviderDispatch(deps: ProviderDispatchDeps): ProviderDispatch {
  return async (job, provider) => {
    // Keyed by the enum, so adding a provider to Prisma without an adapter is a
    // compile error here rather than a silent no-op at runtime.
    const adapter = adapters[provider];

    if (!adapter) {
      throw new Error(`No email adapter for provider ${String(provider)}.`);
    }

    return adapter(job, provider, deps);
  };
}
