import crypto from "node:crypto";

const DEFAULT_SECRET = "sic-qr-signing-secret-development-fallback";

function getSecret(): string {
  return process.env.QR_SIGNING_SECRET || process.env.BETTER_AUTH_SECRET || DEFAULT_SECRET;
}

export interface SignQrTicketParams {
  eventId: string;
  rosterEntryId: string;
}

export interface VerifyQrTicketResult {
  valid: boolean;
  eventId?: string;
  rosterEntryId?: string;
  error?: "malformed" | "invalid_signature" | "invalid_payload";
}

/**
 * Signs an event roster entry using HMAC-SHA256.
 * Format: v1.<eventId>.<rosterEntryId>.<signatureHex>
 */
export function signQrTicket({ eventId, rosterEntryId }: SignQrTicketParams): string {
  const payload = `v1.${eventId}.${rosterEntryId}`;
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed QR ticket string.
 */
export function verifyQrTicket(token: string): VerifyQrTicketResult {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "malformed" };
  }

  const trimmed = token.trim();
  const parts = trimmed.split(".");

  if (parts.length !== 4 || parts[0] !== "v1") {
    return { valid: false, error: "malformed" };
  }

  const [, eventId, rosterEntryId, signature] = parts;

  if (!eventId || !rosterEntryId || !signature) {
    return { valid: false, error: "invalid_payload" };
  }

  const payload = `v1.${eventId}.${rosterEntryId}`;
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  try {
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return { valid: false, error: "invalid_signature" };
    }
  } catch {
    return { valid: false, error: "invalid_signature" };
  }

  return {
    valid: true,
    eventId,
    rosterEntryId,
  };
}

/**
 * Normalizes and formats a manual ticket code (e.g., "sic9f2k7qrm" -> "SIC-9F2K-7QRM").
 */
export function normalizeTicketCode(input: string): string {
  if (!input) return "";
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.startsWith("SIC") && cleaned.length > 3) {
    const rest = cleaned.slice(3);
    const chunk1 = rest.slice(0, 4);
    const chunk2 = rest.slice(4, 8);
    if (chunk2) return `SIC-${chunk1}-${chunk2}`;
    if (chunk1) return `SIC-${chunk1}`;
    return "SIC";
  }
  return cleaned;
}
