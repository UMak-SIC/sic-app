import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { findUnique, compileMarkdown } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  compileMarkdown: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({ emailDelivery: { findUnique } }),
}));

// The real compiler needs the storage endpoint configured; this suite is about
// what the resolver feeds it, not about sanitizing, which has its own coverage.
vi.mock("@/lib/email/markdown-compiler", () => ({ compileMarkdown }));

import {
  applyTemplate,
  buildTemplateValues,
  createDeliveryMessageResolver,
} from "@/lib/queue/delivery-message";
import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";

const job: ClaimedQueueJob = {
  id: "job-1",
  deliveryId: "delivery-1",
  retryCount: 0,
  maxRetries: 3,
  scheduledAt: new Date("2026-09-30T10:00:00.000Z"),
  lockExpiresAt: new Date("2026-09-30T10:05:00.000Z"),
};

function delivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "delivery-1",
    campaign: {
      subject: "Your pass",
      markdown: "Hi {{student_name}}",
      event: {
        id: "event-1",
        name: "UMak SIC Summit",
        startsAt: new Date("2026-10-01T09:00:00.000Z"),
        endsAt: new Date("2026-10-01T17:00:00.000Z"),
        venue: "Audio Visual Room",
      },
      assets: [],
    },
    rosterEntry: {
      id: "roster-entry-1",
      attendee: {
        name: "Ada Lovelace",
        studentId: "S-001",
        displayEmail: "Ada@Example.com",
        section: "BSIT-2A",
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ORGANIZATION_TIMEZONE = "Asia/Manila";
  process.env.QR_TICKET_SECRET = "test-only-qr-ticket-secret-value-32-chars";
  compileMarkdown.mockImplementation((markdown: string) => `<compiled>${markdown}</compiled>`);
  findUnique.mockResolvedValue(delivery());
});

afterEach(() => {
  delete process.env.ORGANIZATION_TIMEZONE;
  delete process.env.QR_TICKET_SECRET;
});

test("substitutes a known token", () => {
  expect(applyTemplate("Hi {{student_name}}!", { student_name: "Ada" })).toEqual({
    text: "Hi Ada!",
    unknownTokens: [],
  });
});

test("tolerates whitespace inside the braces and matches case-insensitively", () => {
  expect(applyTemplate("{{  student_name  }}", { student_name: "Ada" }).text).toBe("Ada");
  expect(applyTemplate("{{STUDENT_NAME}}", { student_name: "Ada" }).text).toBe("Ada");
});

test("strips an unknown token rather than mailing the braces to an attendee", () => {
  // Nothing in the schema supplies a room number, so a body interpolating one has
  // no value. Leaving the placeholder in would put "{{room}}" in front of a
  // recipient.
  const result = applyTemplate("Join us at {{room}}!", { student_name: "Ada" });

  expect(result.text).toBe("Join us at !");
  expect(result.unknownTokens).toEqual(["room"]);
});

test("treats an empty value as no value", () => {
  // A token whose column is null for this delivery is reported the same way an
  // unsupported one is, so the operator learns the event is missing a venue
  // instead of wondering why the email reads oddly.
  const result = applyTemplate("Join us at {{venue}}!", { venue: "" });

  expect(result.text).toBe("Join us at !");
  expect(result.unknownTokens).toEqual(["venue"]);
});

test("reports each unknown token once, in first-seen order", () => {
  const result = applyTemplate("{{room}} {{student_name}} {{room}} {{block}}", {
    student_name: "Ada",
  });

  expect(result.unknownTokens).toEqual(["room", "block"]);
});

test("substitutes every value the schema can supply", () => {
  const values = buildTemplateValues({
    attendee: { name: "Ada Lovelace", studentId: "S-001", section: "BSIT-2A" },
    event: {
      name: "UMak SIC Summit",
      startsAt: new Date("2026-10-01T09:00:00.000Z"),
      venue: "Audio Visual Room",
    },
  });

  expect(Object.keys(values).sort()).toEqual([
    "event_name",
    "event_time",
    "section",
    "student_id",
    "student_name",
    "venue",
  ]);
  expect(values.student_name).toBe("Ada Lovelace");
  expect(values.event_name).toBe("UMak SIC Summit");
  expect(values.section).toBe("BSIT-2A");
  expect(values.venue).toBe("Audio Visual Room");
  // Formatted in the organization timezone rather than UTC.
  expect(values.event_time).not.toBe("Invalid Date");
  expect(values.event_time).toContain("2026");
});

test("omits a section or venue that was never recorded", () => {
  const values = buildTemplateValues({
    attendee: { name: "Ada Lovelace", studentId: "S-001", section: null },
    event: { name: "UMak SIC Summit", startsAt: new Date("2026-10-01T09:00:00.000Z"), venue: null },
  });

  // Absent rather than empty, so applyTemplate reports it instead of leaving a
  // dangling "in the " in the sentence.
  expect(values).not.toHaveProperty("section");
  expect(values).not.toHaveProperty("venue");
});

test("resolves a section and venue into the sent body", async () => {
  findUnique.mockResolvedValue(
    delivery({
      campaign: {
        ...delivery().campaign,
        markdown: "Hi {{student_name}} of {{section}}, join us at {{venue}}.",
        event: {
          ...delivery().campaign.event,
          name: "UMak SIC Summit",
          startsAt: new Date("2026-10-01T09:00:00.000Z"),
          venue: "Audio Visual Room",
        },
      },
    })
  );

  await createDeliveryMessageResolver()(job);

  expect(compileMarkdown).toHaveBeenCalledWith(
    "Hi Ada Lovelace of BSIT-2A, join us at Audio Visual Room.",
  );
});

test("warns when a placeholder could not be resolved", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  findUnique.mockResolvedValue(
    delivery({
      campaign: {
        ...delivery().campaign,
        markdown: "Join us at {{venue}}.",
        event: { ...delivery().campaign.event, venue: null },
      },
    })
  );

  await createDeliveryMessageResolver()(job);

  // The sent email shows "Join us at ." with no explanation, so the warning is
  // the only signal that the event has no venue.
  expect(warn).toHaveBeenCalledWith(expect.stringContaining("venue"));
  warn.mockRestore();
});

test("stays quiet when every placeholder resolved", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  await createDeliveryMessageResolver()(job);

  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

test("resolves a delivery into an addressed, compiled message", async () => {
  const message = await createDeliveryMessageResolver()(job);

  // displayEmail, not normalizedEmail: DMA-02 keeps the normalised form for
  // matching and the display form for what a human sees and what is sent.
  expect(message.to).toBe("Ada@Example.com");
  expect(message.subject).toBe("Your pass");
  expect(message.html).toContain("<compiled>Hi Ada Lovelace</compiled>");
  expect(compileMarkdown).toHaveBeenCalledWith("Hi Ada Lovelace");
});

test("renders a public inline banner in the email instead of attaching it", async () => {
  process.env.AWS_ENDPOINT_URL_S3 = "https://storage.example.com";
  findUnique.mockResolvedValue(delivery({
    campaign: {
      ...delivery().campaign,
      assets: [{
        role: "INLINE",
        asset: {
          originalFilename: "banner image.png",
          objectKey: "assets/banner image.png",
          storageBucket: "PUBLIC_IMAGES",
        },
      }],
    },
  }));

  const message = await createDeliveryMessageResolver()(job);

  expect(compileMarkdown).toHaveBeenCalledWith(
    '<img src="https://storage.example.com/public-images/assets/banner%20image.png" alt="Campaign banner" height="160">\n\nHi Ada Lovelace',
  );
  expect(message.attachments).toEqual([
    expect.objectContaining({ name: "S-001-check-in-pass.png" }),
  ]);
});

test("attaches a signed QR ticket without leaving its marker in the email body", async () => {
  const message = await createDeliveryMessageResolver()(job);

  expect(message.html).not.toContain("QR_TICKET_PASS");
  expect(message.attachments).toEqual([
    expect.objectContaining({ name: "S-001-check-in-pass.png" }),
  ]);
});

test("reads the delivery named by the job", async () => {
  await createDeliveryMessageResolver()(job);

  expect(findUnique).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "delivery-1" } })
  );
});

test("fails loudly when the delivery is gone", async () => {
  findUnique.mockResolvedValue(null);

  // The adapters turn a throw into a failed attempt, which gets retried or
  // dead-lettered. Returning a message here would report a send that never
  // happened.
  await expect(createDeliveryMessageResolver()(job)).rejects.toThrow(/no longer exists/);
});

test("fails when there is no roster entry to address", async () => {
  findUnique.mockResolvedValue(delivery({ rosterEntry: null }));

  await expect(createDeliveryMessageResolver()(job)).rejects.toThrow(/roster entry/);
});

test("fails when the attendee has no address", async () => {
  findUnique.mockResolvedValue(
    delivery({
      rosterEntry: { attendee: { name: "Ada", studentId: "S-1", displayEmail: "  " } },
    })
  );

  await expect(createDeliveryMessageResolver()(job)).rejects.toThrow(/recipient address/);
});
