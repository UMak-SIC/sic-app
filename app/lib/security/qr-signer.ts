import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// DMA-05: a scan is accepted from two hours before the event starts until two
// hours after it ends.
export const CHECK_IN_WINDOW_MS = 2 * 60 * 60 * 1000;

export type QrTicketRejection =
  /** Not a recognisable ticket shape, or the payload is not valid JSON. */
  | "malformed"
  /** The signature does not match the payload. */
  | "invalid_signature"
  /** The window has not opened yet. */
  | "not_yet_valid"
  /** The window has closed; the event ended more than two hours ago. */
  | "expired"
  /** The ticket is valid but belongs to a different event. */
  | "wrong_event";

export type QrTicketVerification =
  | { valid: true; eventId: string; rosterEntryId: string }
  | { valid: false; reason: QrTicketRejection; message: string };

type TicketPayload = {
  eventId: string;
  rosterEntryId: string;
  windowOpensAt: number;
  windowClosesAt: number;
};

export type QrTicketOptions = {
  /** Overridable so tests do not depend on deployment configuration. */
  secret?: string;
};

function requiredSecret(override?: string): string {
  const secret = override ?? process.env.QR_TICKET_SECRET?.trim();

  if (!secret) {
    throw new Error("QR_TICKET_SECRET is required to sign or verify QR tickets.");
  }

  if (secret.length < 32) {
    throw new Error("QR_TICKET_SECRET must be at least 32 characters.");
  }

  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isValidPayload(value: unknown): value is TicketPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.eventId === "string" &&
    typeof candidate.rosterEntryId === "string" &&
    typeof candidate.windowOpensAt === "number" &&
    typeof candidate.windowClosesAt === "number" &&
    Number.isFinite(candidate.windowOpensAt) &&
    Number.isFinite(candidate.windowClosesAt)
  );
}

function reject(reason: QrTicketRejection, message: string): QrTicketVerification {
  return { valid: false, reason, message };
}

/**
 * The check-in window for an event: two hours before it starts through two hours
 * after it ends.
 */
export function getCheckInWindow(
  startsAt: Date,
  endsAt: Date,
): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: new Date(startsAt.getTime() - CHECK_IN_WINDOW_MS),
    closesAt: new Date(endsAt.getTime() + CHECK_IN_WINDOW_MS),
  };
}

/**
 * Produces the opaque ticket for one event roster entry.
 *
 * US-15 and DMA-07: the value is HMAC-SHA256 signed and carries no email, name,
 * or student ID, so a photographed or shared ticket reveals nothing about who it
 * belongs to. It is bound to exactly one roster entry and one event, and cannot
 * be reissued in v1.
 *
 * The roster entry UUID is recoverable from the token, which is inherent to
 * signing a payload rather than encrypting it and is what lets TSK-0902 detect a
 * `wrong_event` scan without a database lookup. Anyone holding a valid ticket
 * inside the window can use it, so the window is the replay bound.
 */
export function signQrTicket(
  {
    eventId,
    rosterEntryId,
    startsAt,
    endsAt,
  }: { eventId: string; rosterEntryId: string; startsAt: Date; endsAt: Date },
  options: QrTicketOptions = {},
): string {
  if (!eventId.trim() || !rosterEntryId.trim()) {
    throw new Error("A QR ticket requires an event and a roster entry.");
  }

  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) {
    throw new Error("A QR ticket requires valid event start and end instants.");
  }

  const secret = requiredSecret(options.secret);
  const { opensAt, closesAt } = getCheckInWindow(startsAt, endsAt);
  const payload: TicketPayload = {
    eventId,
    rosterEntryId,
    windowOpensAt: opensAt.getTime(),
    windowClosesAt: closesAt.getTime(),
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * Verifies a scanned ticket.
 *
 * TSK-0902 consumes this and needs the reason to be specific so a scanning
 * administrator sees "expired" rather than a generic rejection, so every failure
 * mode is its own value.
 *
 * `expectedEventId`, when given, produces `wrong_event` rather than accepting a
 * valid ticket for an event the administrator is not scanning.
 */
export function verifyQrTicket(
  ticket: string,
  {
    expectedEventId,
    now = new Date(),
    secret,
  }: QrTicketOptions & { expectedEventId?: string; now?: Date } = {},
): QrTicketVerification {
  let signingSecret: string;

  try {
    signingSecret = requiredSecret(secret);
  } catch {
    // A misconfigured deployment must not look like a bad ticket.
    throw new Error("QR_TICKET_SECRET is required to sign or verify QR tickets.");
  }

  const parts = ticket.trim().split(".");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return reject("malformed", "This is not a valid QR ticket.");
  }

  const [encoded, providedSignature] = parts;

  // Verify before parsing. Nothing unverified is decoded or interpreted.
  const expectedSignature = sign(encoded, signingSecret);
  const expected = Buffer.from(expectedSignature, "utf8");
  const provided = Buffer.from(providedSignature, "utf8");

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return reject("invalid_signature", "This QR ticket could not be verified.");
  }

  let payload: unknown;

  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return reject("malformed", "This is not a valid QR ticket.");
  }

  if (!isValidPayload(payload)) {
    return reject("malformed", "This is not a valid QR ticket.");
  }

  if (expectedEventId !== undefined && payload.eventId !== expectedEventId) {
    return reject("wrong_event", "This QR ticket belongs to a different event.");
  }

  if (now.getTime() < payload.windowOpensAt) {
    return reject("not_yet_valid", "Check-in for this event has not opened yet.");
  }

  if (now.getTime() > payload.windowClosesAt) {
    return reject("expired", "This QR ticket has expired.");
  }

  return { valid: true, eventId: payload.eventId, rosterEntryId: payload.rosterEntryId };
}
