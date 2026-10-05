import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { EmailProvider } from "@prisma/client";

const requireAdmin = vi.hoisted(() => vi.fn());
const dispatchEmail = vi.hoisted(() => vi.fn());
const processQueueJobs = vi.hoisted(() => vi.fn());
const captured = vi.hoisted(() => ({ deps: null as { resolveMessage: (job: unknown) => Promise<unknown> } | null }));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: () => requireAdmin(),
}));

// The adapter is covered by its own suite. What matters here is the route's
// contract, so the transport is replaced — but the deps it was built with are
// captured, because the composed message is part of what the route promises.
vi.mock("@/lib/queue/providers", () => ({
  createProviderDispatch: (deps: unknown) => {
    captured.deps = deps as { resolveMessage: (job: unknown) => Promise<unknown> };
    return dispatchEmail;
  },
}));

vi.mock("@/lib/queue/process-jobs", () => ({
  processQueueJobs: (...args: unknown[]) => processQueueJobs(...args),
}));

import { POST } from "@/app/api/campaigns/test-send/route";

const ORIGINAL_STORAGE_ENDPOINT = process.env.AWS_ENDPOINT_URL_S3;

function post(body: unknown) {
  return new NextRequest("http://localhost/api/campaigns/test-send", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  captured.deps = null;
  // compileMarkdown pins image hosts to the storage endpoint and throws without
  // it. Production sets this; the suite has to as well.
  process.env.AWS_ENDPOINT_URL_S3 = "https://storage.example.com";
  requireAdmin.mockResolvedValue({ adminId: "admin-1" });
  dispatchEmail.mockResolvedValue({
    succeeded: true,
    httpStatus: 200,
    providerMessageId: "m-1",
  });
});

afterEach(() => {
  if (ORIGINAL_STORAGE_ENDPOINT === undefined) {
    delete process.env.AWS_ENDPOINT_URL_S3;
  } else {
    process.env.AWS_ENDPOINT_URL_S3 = ORIGINAL_STORAGE_ENDPOINT;
  }
});

describe("POST /api/campaigns/test-send", () => {
  it("refuses an unauthenticated caller", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const res = await POST(post({ to: "someone@example.com" }));

    expect(res.status).toBe(401);
    expect(dispatchEmail).not.toHaveBeenCalled();
  });

  it("sends one message to one address and reports the provider's answer", async () => {
    const res = await POST(
      post({ to: "  Someone@Example.com ", subject: "Check this", markdown: "Hello **there**" })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      sent: true,
      provider: EmailProvider.BREVO,
      subject: "Check this",
      providerMessageId: "m-1",
    });

    const [job, provider] = dispatchEmail.mock.calls[0];
    expect(provider).toBe(EmailProvider.BREVO);
    expect(job).toMatchObject({ deliveryId: "test-send", retryCount: 0, maxRetries: 0 });
  });

  it("never enqueues, and never goes through the batch queue", async () => {
    // US-17 is explicit that a test send must not enqueue batch roster jobs. The
    // reason is capacity: a test send competing for a queue slot or the daily
    // provider quota would be a real defect, not a cosmetic one.
    const res = await POST(post({ to: "someone@example.com", markdown: "Hi" }));

    expect(res.status).toBe(200);
    expect(processQueueJobs).not.toHaveBeenCalled();
    expect(dispatchEmail).toHaveBeenCalledTimes(1);
  });

  it("renders the body as sanitized HTML rather than accepting raw markup", async () => {
    await POST(
      post({
        to: "someone@example.com",
        markdown: "# Hi\n\n<script>alert(1)</script>\n\n**bold**",
      })
    );

    // Resolve the message the route composed, rather than trusting that it did.
    const message = (await captured.deps?.resolveMessage({})) as { html: string };

    expect(message.html).toContain("<h1>Hi</h1>");
    expect(message.html).toContain("<strong>bold</strong>");
    // The sanitizer drops disallowed tags rather than escaping them.
    expect(message.html).not.toContain("script");
  });

  it("attaches a clearly non-functional practice pass image when requested", async () => {
    await POST(post({ to: "someone@example.com", markdown: "Hi", includePracticePass: true }));

    const message = (await captured.deps?.resolveMessage({})) as {
      html: string;
      attachments?: { name: string; content: string }[];
    };

    expect(message.html).toContain("<p>Hi</p>");
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments?.[0]).toMatchObject({ name: "practice-check-in-pass.png" });
    expect(Buffer.from(message.attachments?.[0].content ?? "", "base64").subarray(0, 4)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
  });

  it("rejects a malformed practice-pass flag", async () => {
    const res = await POST(post({ to: "someone@example.com", includePracticePass: "yes" }));

    expect(res.status).toBe(400);
    expect(dispatchEmail).not.toHaveBeenCalled();
  });

  it("addresses the message to the display form of the address", async () => {
    await POST(post({ to: "  Someone@Example.com ", markdown: "Hi" }));

    const message = (await captured.deps?.resolveMessage({})) as { to: string };
    expect(message.to).toBe("Someone@Example.com");
  });

  it("rejects an address the registry would also reject", async () => {
    const res = await POST(post({ to: "not-an-email" }));

    expect(res.status).toBe(400);
    expect(dispatchEmail).not.toHaveBeenCalled();
  });

  it("rejects a missing address", async () => {
    const res = await POST(post({ markdown: "Hi" }));

    expect(res.status).toBe(400);
    expect(dispatchEmail).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const res = await POST(post("not json"));

    expect(res.status).toBe(400);
    expect(dispatchEmail).not.toHaveBeenCalled();
  });

  it("rejects fields of the wrong type instead of coercing them", async () => {
    const res = await POST(post({ to: "someone@example.com", subject: 42, markdown: "Hi" }));

    expect(res.status).toBe(400);
    expect(dispatchEmail).not.toHaveBeenCalled();
  });

  it("supplies a default subject when none is given", async () => {
    const res = await POST(post({ to: "someone@example.com", markdown: "Hi" }));

    expect((await res.json()).subject).toBe("UMak SIC test email");
  });

  it("sends an empty body rather than refusing, so a blank draft is still testable", async () => {
    const res = await POST(post({ to: "someone@example.com" }));

    expect(res.status).toBe(200);
  });

  it("reports an unconfigured service as unavailable, not as a crash", async () => {
    delete process.env.AWS_ENDPOINT_URL_S3;

    const res = await POST(post({ to: "someone@example.com", markdown: "Hi" }));

    expect(res.status).toBe(503);
    expect(dispatchEmail).not.toHaveBeenCalled();
  });

  it("reports a provider failure as a bad gateway with the provider's reason", async () => {
    dispatchEmail.mockResolvedValue({
      succeeded: false,
      httpStatus: 401,
       errorMessage: "Brevo rejected the API key. Forbidden",
    });

    const res = await POST(post({ to: "someone@example.com", markdown: "Hi" }));

    // 502: the request was fine, the upstream provider was not.
    expect(res.status).toBe(502);
    // A response body can only be read once, so it is parsed once here.
    const body = await res.json();
    expect(body).toMatchObject({ httpStatus: 401 });
    expect(body.error).toContain("API key");
  });
});
