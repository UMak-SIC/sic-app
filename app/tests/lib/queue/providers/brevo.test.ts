import { beforeEach, expect, test, vi } from "vitest";
import { EmailProvider } from "@prisma/client";

import { dispatchViaBrevo } from "@/lib/queue/providers/brevo";
import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";
import type { OutboundMessage } from "@/lib/queue/providers/types";

const job: ClaimedQueueJob = {
  id: "job-1",
  deliveryId: "delivery-1",
  retryCount: 1,
  maxRetries: 3,
  scheduledAt: new Date("2026-09-30T10:00:00.000Z"),
  lockExpiresAt: new Date("2026-09-30T10:05:00.000Z"),
};

const message: OutboundMessage = {
  to: "attendee@example.com",
  subject: "Your UMak SIC check-in pass",
  html: "<p>Hello</p>",
  text: "Hello",
  replyTo: "events@example.com",
};

const env = {
  BREVO_API_KEY: "xkeysib-test-abcdefghijklmnop",
  BREVO_FROM_EMAIL: "events@example.com",
  BREVO_FROM_NAME: "UMak SIC",
};

function ok(body: unknown, status = 201) {
  return new Response(JSON.stringify(body), { status });
}

let fetchImpl: ReturnType<typeof vi.fn>;
const resolveMessage = vi.fn(async () => message);

beforeEach(() => {
  vi.clearAllMocks();
  fetchImpl = vi.fn();
});

function dispatch(overrides: Partial<Parameters<typeof dispatchViaBrevo>[2]> = {}) {
  return dispatchViaBrevo(job, EmailProvider.BREVO, {
    resolveMessage,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    env,
    ...overrides,
  });
}

test("posts the message to the Brevo transactional endpoint", async () => {
  fetchImpl.mockResolvedValue(ok({ messageId: "<abc@brevo>" }));

  const result = await dispatch();

  expect(result.succeeded).toBe(true);
  expect(result.providerMessageId).toBe("<abc@brevo>");
  // Brevo answers 201, not 200, so the status is asserted rather than assumed.
  expect(result.httpStatus).toBe(201);

  const [url, init] = fetchImpl.mock.calls[0];
  expect(url).toBe("https://api.brevo.com/v3/smtp/email");
  expect(init.method).toBe("POST");
  // Brevo uses a bare api-key header, not Basic auth.
  expect(init.headers["api-key"]).toBe("xkeysib-test-abcdefghijklmnop");
  expect(init.headers["Content-Type"]).toBe("application/json");

  const payload = JSON.parse(init.body);
  expect(payload.sender).toEqual({ email: "events@example.com", name: "UMak SIC" });
  expect(payload.to).toEqual([{ email: "attendee@example.com" }]);
  expect(payload.subject).toBe("Your UMak SIC check-in pass");
  expect(payload.htmlContent).toBe("<p>Hello</p>");
  expect(payload.textContent).toBe("Hello");
  expect(payload.replyTo).toEqual({ email: "events@example.com" });
});

test("omits the sender name when it is not configured", async () => {
  fetchImpl.mockResolvedValue(ok({ messageId: "m1" }));

  await dispatch({ env: { ...env, BREVO_FROM_NAME: "  " } });

  const payload = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(payload.sender).toEqual({ email: "events@example.com" });
});

test("omits optional fields rather than sending empty strings", async () => {
  fetchImpl.mockResolvedValue(ok({ messageId: "m1" }));
  resolveMessage.mockResolvedValueOnce({
    to: "attendee@example.com",
    subject: "Subject",
    html: "<p>Hi</p>",
  });

  await dispatch();

  const payload = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(payload).not.toHaveProperty("textContent");
  expect(payload).not.toHaveProperty("replyTo");
});

test("reports a rejected API key distinctly from a rejected message", async () => {
  fetchImpl.mockResolvedValue(ok({ code: "unauthorized", message: "Key not found" }, 401));

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.httpStatus).toBe(401);
  expect(result.errorMessage).toContain("API key");
  expect(result.errorMessage).toContain("Key not found");
});

test("reports an invalid parameter without leaking the whole response", async () => {
  fetchImpl.mockResolvedValue(
    ok({ code: "invalid_parameter", message: "sender email invalid" }, 400)
  );

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.httpStatus).toBe(400);
  expect(result.errorMessage).toBe("Brevo rejected the message. sender email invalid");
});

test("reports rate limiting and server errors distinctly", async () => {
  fetchImpl.mockResolvedValueOnce(ok({ message: "slow down" }, 429));
  expect((await dispatch()).errorMessage).toContain("rate limiting");

  fetchImpl.mockResolvedValueOnce(ok({ message: "unavailable" }, 503));
  expect((await dispatch()).errorMessage).toContain("server error");
});

test("survives a non-JSON error body", async () => {
  fetchImpl.mockResolvedValue(new Response("gateway timeout", { status: 504 }));

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.errorMessage).toContain("server error");
  expect(result.responsePayload).toBeUndefined();
});

test("records a network failure rather than throwing", async () => {
  fetchImpl.mockRejectedValue(new Error("socket hang up"));

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.errorMessage).toContain("socket hang up");
});

test("fails clearly when configuration is missing", async () => {
  const result = await dispatch({ env: { BREVO_FROM_EMAIL: "events@example.com" } });

  expect(result.succeeded).toBe(false);
  expect(result.errorMessage).toContain("BREVO_API_KEY");
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("refuses a message with no subject or recipient", async () => {
  resolveMessage.mockResolvedValueOnce({ ...message, subject: " " });
  expect((await dispatch()).errorMessage).toContain("subject");

  resolveMessage.mockResolvedValueOnce({ ...message, to: "" });
  expect((await dispatch()).errorMessage).toContain("recipient");
  expect(fetchImpl).not.toHaveBeenCalled();
});
