import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  CHECK_IN_WINDOW_MS,
  getCheckInWindow,
  signQrTicket,
  verifyQrTicket,
} from "@/lib/security/qr-signer";

const SECRET = "test-only-qr-ticket-secret-value-32-chars";
const OTHER_SECRET = "a-completely-different-secret-of-32-chars";

const EVENT_ID = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";
const ROSTER_ENTRY_ID = "3b1f7c2e-5a44-4d19-9c0e-8f2a6b7d1e30";
const ATTENDEE_EMAIL = "student@example.com";
const ATTENDEE_NAME = "Juan Dela Cruz";
const ATTENDEE_STUDENT_ID = "2023-1";

const STARTS_AT = new Date("2026-10-01T09:00:00.000Z");
const ENDS_AT = new Date("2026-10-01T17:00:00.000Z");
const MID_EVENT = new Date("2026-10-01T13:00:00.000Z");

const originalSecret = process.env.QR_TICKET_SECRET;

beforeEach(() => {
  process.env.QR_TICKET_SECRET = SECRET;
});

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.QR_TICKET_SECRET;
  } else {
    process.env.QR_TICKET_SECRET = originalSecret;
  }
});

function sign(overrides: Partial<Parameters<typeof signQrTicket>[0]> = {}) {
  return signQrTicket({
    eventId: EVENT_ID,
    rosterEntryId: ROSTER_ENTRY_ID,
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    ...overrides,
  });
}

// Signs an arbitrary body with the real secret, so verification gets past the
// signature check and actually exercises the parsing and shape guards.
function signedRawEnvelope(body: string): string {
  const encoded = Buffer.from(body, "utf8").toString("base64url");
  const signature = createHmac("sha256", SECRET).update(encoded).digest("base64url");

  return `${encoded}.${signature}`;
}

function signedEnvelope(value: unknown): string {
  return signedRawEnvelope(JSON.stringify(value));
}

function expectReason(
  ticket: string,
  reason: string,
  options: Parameters<typeof verifyQrTicket>[1] = {},
) {
  const result = verifyQrTicket(ticket, options);

  expect(result.valid, ticket).toBe(false);

  if (!result.valid) {
    expect(result.reason, ticket).toBe(reason);
    expect(result.message.length).toBeGreaterThan(0);
  }

  return result;
}

describe("getCheckInWindow", () => {
  test("spans two hours before the start through two hours after the end", () => {
    const { opensAt, closesAt } = getCheckInWindow(STARTS_AT, ENDS_AT);

    expect(opensAt.toISOString()).toBe("2026-10-01T07:00:00.000Z");
    expect(closesAt.toISOString()).toBe("2026-10-01T19:00:00.000Z");
  });

  test("uses the documented window constant", () => {
    expect(CHECK_IN_WINDOW_MS).toBe(2 * 60 * 60 * 1000);
  });
});

describe("signQrTicket", () => {
  test("produces a two-part token", () => {
    const parts = sign().split(".");

    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  test("is deterministic for the same inputs", () => {
    expect(sign()).toBe(sign());
  });

  test("differs when the roster entry differs", () => {
    expect(sign()).not.toBe(sign({ rosterEntryId: "some-other-entry-id" }));
  });

  test("differs when the secret differs", () => {
    const withOther = signQrTicket(
      { eventId: EVENT_ID, rosterEntryId: ROSTER_ENTRY_ID, startsAt: STARTS_AT, endsAt: ENDS_AT },
      { secret: OTHER_SECRET },
    );

    expect(withOther).not.toBe(sign());
  });

  test("rejects missing identifiers and invalid instants", () => {
    expect(() => sign({ eventId: "  " })).toThrow(/requires an event and a roster entry/);
    expect(() => sign({ rosterEntryId: "" })).toThrow(/requires an event and a roster entry/);
    expect(() => sign({ startsAt: new Date("nope") })).toThrow(/valid event start and end/);
  });

  test("requires a configured secret of at least 32 characters", () => {
    delete process.env.QR_TICKET_SECRET;
    expect(() => sign()).toThrow(/QR_TICKET_SECRET is required/);

    process.env.QR_TICKET_SECRET = "too-short";
    expect(() => sign()).toThrow(/at least 32 characters/);
  });
});

describe("verifyQrTicket", () => {
  test("accepts a valid ticket inside the window", () => {
    const result = verifyQrTicket(sign(), { now: MID_EVENT });

    expect(result).toEqual({
      valid: true,
      eventId: EVENT_ID,
      rosterEntryId: ROSTER_ENTRY_ID,
    });
  });

  test("accepts the exact window boundaries", () => {
    const ticket = sign();

    expect(verifyQrTicket(ticket, { now: new Date("2026-10-01T07:00:00.000Z") }).valid).toBe(
      true,
    );
    expect(verifyQrTicket(ticket, { now: new Date("2026-10-01T19:00:00.000Z") }).valid).toBe(
      true,
    );
  });

  test("rejects before the window opens", () => {
    expectReason(sign(), "not_yet_valid", { now: new Date("2026-10-01T06:59:59.999Z") });
  });

  test("rejects after the window closes", () => {
    expectReason(sign(), "expired", { now: new Date("2026-10-01T19:00:00.001Z") });
  });

  test("rejects a ticket for a different event", () => {
    const other = "11111111-2222-3333-4444-555555555555";

    expectReason(sign(), "wrong_event", { expectedEventId: other, now: MID_EVENT });
  });

  test("accepts a matching expected event", () => {
    expect(
      verifyQrTicket(sign(), { expectedEventId: EVENT_ID, now: MID_EVENT }).valid,
    ).toBe(true);
  });

  test("rejects a tampered payload", () => {
    const [encoded, signature] = sign().split(".");
    const forged = Buffer.from(
      JSON.stringify({
        eventId: EVENT_ID,
        rosterEntryId: "11111111-2222-3333-4444-555555555555",
        windowOpensAt: STARTS_AT.getTime() - CHECK_IN_WINDOW_MS,
        windowClosesAt: ENDS_AT.getTime() + CHECK_IN_WINDOW_MS,
      }),
      "utf8",
    ).toString("base64url");

    expectReason(`${forged}.${signature}`, "invalid_signature");
    expect(encoded.length).toBeGreaterThan(0);
  });

  test("rejects a tampered signature", () => {
    const [encoded, signature] = sign().split(".");
    const flipped = `${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;

    expectReason(`${encoded}.${flipped}`, "invalid_signature");
  });

  test("rejects a ticket signed with a different secret", () => {
    const other = signQrTicket(
      { eventId: EVENT_ID, rosterEntryId: ROSTER_ENTRY_ID, startsAt: STARTS_AT, endsAt: ENDS_AT },
      { secret: OTHER_SECRET },
    );

    expectReason(other, "invalid_signature");
  });

  test("rejects malformed input with distinct reasons", () => {
    expectReason("", "malformed");
    expectReason("not-a-ticket", "malformed");
    expectReason("onlyonepart", "malformed");
    expectReason("a.b.c", "malformed");
    expectReason(".", "malformed");
  });

  test("rejects a correctly signed payload that is not a valid ticket shape", () => {
    // Signed with the real secret, so this passes the signature check and is
    // stopped by shape validation instead. Without a genuine signature these
    // guards would never be reached.
    expectReason(signedEnvelope({ nonsense: true }), "malformed");
    expectReason(signedEnvelope({ eventId: EVENT_ID }), "malformed");
    expectReason(signedEnvelope([]), "malformed");
    expectReason(signedEnvelope("a string"), "malformed");
    expectReason(
      signedEnvelope({
        eventId: EVENT_ID,
        rosterEntryId: ROSTER_ENTRY_ID,
        windowOpensAt: "not-a-number",
        windowClosesAt: ENDS_AT.getTime() + CHECK_IN_WINDOW_MS,
      }),
      "malformed",
    );
    expectReason(
      signedEnvelope({
        eventId: EVENT_ID,
        rosterEntryId: ROSTER_ENTRY_ID,
        windowOpensAt: Number.NaN,
        windowClosesAt: ENDS_AT.getTime() + CHECK_IN_WINDOW_MS,
      }),
      "malformed",
    );
  });

  test("rejects a correctly signed payload that is not valid JSON", () => {
    // The body is signed, so verification reaches the parse step rather than
    // being stopped earlier, and must report malformed rather than throwing.
    expectReason(signedRawEnvelope("this is not json"), "malformed");
    expectReason(signedRawEnvelope(""), "malformed");
  });

  test("verifies the signature before parsing anything", () => {
    const signed = sign();
    const [, signature] = signed.split(".");
    const notJson = Buffer.from("this is not json", "utf8").toString("base64url");

    // A body that does not match the signature is rejected as invalid_signature
    // and never decoded, so unverified input is never interpreted.
    expectReason(`${notJson}.${signature}`, "invalid_signature");
  });

  test("throws rather than reporting a bad ticket when the secret is missing", () => {
    delete process.env.QR_TICKET_SECRET;

    expect(() => verifyQrTicket(sign())).toThrow(/QR_TICKET_SECRET is required/);
  });

  test("trims surrounding whitespace from a scanned value", () => {
    expect(verifyQrTicket(`  ${sign()}  `, { now: MID_EVENT }).valid).toBe(true);
  });
});

describe("opaqueness", () => {
  test("the token never contains attendee identity", () => {
    const ticket = sign();
    const decoded = Buffer.from(ticket.split(".")[0], "base64url").toString("utf8");

    expect(decoded).not.toContain(ATTENDEE_EMAIL);
    expect(decoded).not.toContain(ATTENDEE_NAME);
    expect(decoded).not.toContain(ATTENDEE_STUDENT_ID);
    expect(decoded.toLowerCase()).not.toContain("email");
    expect(decoded.toLowerCase()).not.toContain("student");
  });

  test("the token is url-safe with no padding characters", () => {
    const ticket = sign();

    expect(ticket).not.toContain("+");
    expect(ticket).not.toContain("/");
    expect(ticket).not.toContain("=");
  });

  test("the signature is a base64url SHA-256 digest", () => {
    const signature = sign().split(".")[1];

    // 32 bytes -> 43 base64url characters, unpadded.
    expect(signature).toHaveLength(43);
  });
});
