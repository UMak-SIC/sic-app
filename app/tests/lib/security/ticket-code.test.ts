import { describe, expect, it } from "vitest";
import { normalizeTicketCode } from "@/lib/security/ticket-code";

describe("normalizeTicketCode", () => {
  it("normalizes ticket codes correctly", () => {
    expect(normalizeTicketCode("sic9f2k7qrm")).toBe("SIC-9F2K-7QRM");
    expect(normalizeTicketCode("SIC-9F2K-7QRM")).toBe("SIC-9F2K-7QRM");
    expect(normalizeTicketCode("sic-abc")).toBe("SIC-ABC");
    expect(normalizeTicketCode("")).toBe("");
  });
});
