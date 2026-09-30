import { describe, expect, it } from "vitest";
import {
  normalizeTicketCode,
  signQrTicket,
  verifyQrTicket,
} from "@/lib/security/qr-signer";

describe("qr-signer", () => {
  it("generates a signed token and verifies it correctly", () => {
    const eventId = "11111111-1111-1111-1111-111111111111";
    const rosterEntryId = "22222222-2222-2222-2222-222222222222";

    const token = signQrTicket({ eventId, rosterEntryId });
    expect(token).toContain("v1.");
    expect(token).toContain(eventId);
    expect(token).toContain(rosterEntryId);

    const result = verifyQrTicket(token);
    expect(result.valid).toBe(true);
    expect(result.eventId).toBe(eventId);
    expect(result.rosterEntryId).toBe(rosterEntryId);
  });

  it("rejects tampered tokens", () => {
    const eventId = "11111111-1111-1111-1111-111111111111";
    const rosterEntryId = "22222222-2222-2222-2222-222222222222";

    const token = signQrTicket({ eventId, rosterEntryId });
    const tampered = token.slice(0, -4) + "abcd";

    const result = verifyQrTicket(tampered);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("invalid_signature");
  });

  it("rejects malformed strings", () => {
    expect(verifyQrTicket("invalid-token").valid).toBe(false);
    expect(verifyQrTicket("").valid).toBe(false);
    expect(verifyQrTicket("v1.event.roster").valid).toBe(false);
  });

  it("normalizes ticket codes correctly", () => {
    expect(normalizeTicketCode("sic9f2k7qrm")).toBe("SIC-9F2K-7QRM");
    expect(normalizeTicketCode("SIC-9F2K-7QRM")).toBe("SIC-9F2K-7QRM");
    expect(normalizeTicketCode("sic-abc")).toBe("SIC-ABC");
  });
});
