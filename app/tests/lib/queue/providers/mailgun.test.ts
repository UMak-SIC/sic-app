import { beforeEach, expect, test, vi } from "vitest";
import { EmailProvider } from "@prisma/client";

import { dispatchViaMailgun } from "@/lib/queue/providers/mailgun";
import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";
import type { OutboundMessage } from "@/lib/queue/providers/types";

const job: ClaimedQueueJob = {
  id: "job-1",
  deliveryId: "delivery-1",
  retryCount: 0,
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
  tags: ["campaign", "invite"],
};

const env = {
  MAILGUN_API_KEY: "key-test-abcdefghijklmnop",
  MAILGUN_DOMAIN: "mg.example.com",
  MAILGUN_FROM: "UMak SIC <events@example.com>",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

let fetchImpl: ReturnType<typeof vi.fn>;
const resolveMessage = vi.fn(async () => message);

beforeEach(() => {
  vi.clearAllMocks();
  fetchImpl = vi.fn();
});

function dispatch(overrides: Partial<Parameters<typeof dispatchViaMailgun>[2]> = {}) {
  return dispatchViaMailgun(job, EmailProvider.MAILGUN, {
    resolveMessage,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    env,
    ...overrides,
  });
}

test("posts the message to the Mailgun messages endpoint", async () => {
  fetchImpl.mockResolvedValue(ok({ id: "<20260930@mg.example.com>", message: "Queued" }));

  const result = await dispatch();

  expect(result.succeeded).toBe(true);
  expect(result.providerMessageId).toBe("<20260930@mg.example.com>");
  expect(result.httpStatus).toBe(200);

  const [url, init] = fetchImpl.mock.calls[0];
  expect(url).toBe("https://api.mailgun.net/v3/mg.example.com/messages");
  expect(init.method).toBe("POST");
  // Basic auth as `api:<key>`, and form encoding rather than SMTP.
  expect(init.headers.Authorization).toBe(
    `Basic ${Buffer.from("api:key-test-abcdefghijklmnop").toString("base64")}`
  );
  expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

  const form = new URLSearchParams(init.body);
  expect(form.get("from")).toBe("UMak SIC <events@example.com>");
  expect(form.get("to")).toBe("attendee@example.com");
  expect(form.get("subject")).toBe("Your UMak SIC check-in pass");
  expect(form.get("html")).toBe("<p>Hello</p>");
  expect(form.get("text")).toBe("Hello");
  expect(form.get("h:Reply-To")).toBe("events@example.com");
});

test("truncates tags to Mailgun's three character limit", async () => {
  fetchImpl.mockResolvedValue(ok({ id: "m1" }));

  await dispatch();

  const form = new URLSearchParams(fetchImpl.mock.calls[0][1].body);
  // "campaign" would be rejected by Mailgun at four-plus characters.
  expect(form.getAll("o:tag")).toEqual(["cam", "inv"]);
});

test("reports a rejected API key distinctly from a rejected message", async () => {
  fetchImpl.mockResolvedValue(ok({ message: "Forbidden" }, 401));

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.httpStatus).toBe(401);
  expect(result.errorMessage).toContain("API key");
  expect(result.errorMessage).toContain("Forbidden");
  expect(result.providerMessageId).toBeUndefined();
});

test("reports rate limiting separately from a bad payload", async () => {
  fetchImpl.mockResolvedValue(ok({ message: "Too many requests" }, 429));

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.errorMessage).toContain("rate limiting");
});

test("reports a provider server error without treating it as success", async () => {
  fetchImpl.mockResolvedValue(ok({ message: "oops" }, 502));

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.httpStatus).toBe(502);
  expect(result.errorMessage).toContain("server error");
});

test("survives a non-JSON error body", async () => {
  fetchImpl.mockResolvedValue(new Response("<html>gateway timeout</html>", { status: 504 }));

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.errorMessage).toContain("server error");
  // Nothing loggable came back, and that must not throw.
  expect(result.responsePayload).toBeUndefined();
});

test("records a network failure rather than throwing", async () => {
  fetchImpl.mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.errorMessage).toContain("ENOTFOUND");
});

test("fails clearly when configuration is missing", async () => {
  const result = await dispatch({ env: { MAILGUN_DOMAIN: "mg.example.com" } });

  expect(result.succeeded).toBe(false);
  expect(result.errorMessage).toContain("MAILGUN_API_KEY");
  // A configuration gap must not turn into a real send attempt.
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("refuses a message with no recipient", async () => {
  resolveMessage.mockResolvedValueOnce({ ...message, to: "  " });

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.errorMessage).toContain("recipient");
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("refuses a message with no HTML body", async () => {
  resolveMessage.mockResolvedValueOnce({ ...message, html: "" });

  const result = await dispatch();

  expect(result.succeeded).toBe(false);
  expect(result.errorMessage).toContain("HTML body");
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("percent-encodes the domain so a subdomain cannot alter the path", async () => {
  fetchImpl.mockResolvedValue(ok({ id: "m1" }));

  await dispatch({ env: { ...env, MAILGUN_DOMAIN: "mg.example.com/../other" } });

  expect(fetchImpl.mock.calls[0][0]).toBe(
    "https://api.mailgun.net/v3/mg.example.com%2F..%2Fother/messages"
  );
});
