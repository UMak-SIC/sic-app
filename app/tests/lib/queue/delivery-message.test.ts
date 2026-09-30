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
      event: { name: "UMak SIC Summit", startsAt: new Date("2026-10-01T09:00:00.000Z") },
    },
    rosterEntry: {
      attendee: { name: "Ada Lovelace", studentId: "S-001", displayEmail: "Ada@Example.com" },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ORGANIZATION_TIMEZONE = "Asia/Manila";
  compileMarkdown.mockImplementation((markdown: string) => `<compiled>${markdown}</compiled>`);
  findUnique.mockResolvedValue(delivery());
});

afterEach(() => {
  delete process.env.ORGANIZATION_TIMEZONE;
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
  // Event has no venue column, so a body interpolating {{venue}} has no value.
  // Leaving the placeholder in would put "{{venue}}" in front of a recipient.
  const result = applyTemplate("Join us at {{venue}}!", { student_name: "Ada" });

  expect(result.text).toBe("Join us at !");
  expect(result.unknownTokens).toEqual(["venue"]);
});

test("reports each unknown token once, in first-seen order", () => {
  const result = applyTemplate("{{venue}} {{student_name}} {{venue}} {{room}}", {
    student_name: "Ada",
  });

  expect(result.unknownTokens).toEqual(["venue", "room"]);
});

test("substitutes every value the schema can supply", () => {
  const values = buildTemplateValues({
    attendee: { name: "Ada Lovelace", studentId: "S-001" },
    event: { name: "UMak SIC Summit", startsAt: new Date("2026-10-01T09:00:00.000Z") },
  });

  expect(Object.keys(values).sort()).toEqual([
    "event_name",
    "event_time",
    "student_id",
    "student_name",
  ]);
  expect(values.student_name).toBe("Ada Lovelace");
  expect(values.event_name).toBe("UMak SIC Summit");
  // Formatted in the organization timezone rather than UTC.
  expect(values.event_time).not.toBe("Invalid Date");
  expect(values.event_time).toContain("2026");
});

test("resolves a delivery into an addressed, compiled message", async () => {
  const message = await createDeliveryMessageResolver()(job);

  // displayEmail, not normalizedEmail: DMA-02 keeps the normalised form for
  // matching and the display form for what a human sees and what is sent.
  expect(message.to).toBe("Ada@Example.com");
  expect(message.subject).toBe("Your pass");
  expect(message.html).toBe("<compiled>Hi Ada Lovelace</compiled>");
  expect(compileMarkdown).toHaveBeenCalledWith("Hi Ada Lovelace");
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
