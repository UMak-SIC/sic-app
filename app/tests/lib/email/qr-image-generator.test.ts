import jsQR from "jsqr";
import { PNG } from "pngjs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  MAX_TICKET_LENGTH,
  qrTicketCid,
  renderQrTicketDataUrl,
  renderQrTicketImage,
} from "@/lib/email/qr-image-generator";
import { signQrTicket } from "@/lib/security/qr-signer";

const SECRET = "test-only-qr-ticket-secret-value-32-chars";

const EVENT_ID = "9fdcd48a-170a-4af7-862e-a511ad9d7b94";
const STARTS_AT = new Date("2026-10-01T09:00:00.000Z");
const ENDS_AT = new Date("2026-10-01T17:00:00.000Z");

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

function ticket(rosterEntryId = "3b1f7c2e-5a44-4d19-9c0e-8f2a6b7d1e30") {
  return signQrTicket({ eventId: EVENT_ID, rosterEntryId, startsAt: STARTS_AT, endsAt: ENDS_AT });
}

// Decodes a rendered PNG back to its payload, so the tests assert what a
// scanning phone would actually read rather than the encoder's intent.
function decode(buffer: Uint8Array): string | null {
  const png = PNG.sync.read(Buffer.from(buffer));
  const result = jsQR(
    new Uint8ClampedArray(png.data),
    png.width,
    png.height,
  );

  return result?.data ?? null;
}

describe("renderQrTicketImage", () => {
  test("produces a real PNG", async () => {
    const image = await renderQrTicketImage(ticket());

    // PNG magic number.
    expect([...image.buffer.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(image.mediaType).toBe("image/png");
  });

  test("encodes exactly the signed ticket and nothing else", async () => {
    const value = ticket();

    const image = await renderQrTicketImage(value);

    expect(decode(image.buffer)).toBe(value);
  });

  test("the encoded payload exposes no attendee identity", async () => {
    const value = ticket();

    expect(decode((await renderQrTicketImage(value)).buffer)).toBe(value);
    expect(value).not.toContain("student@example.com");
  });

  test("is a pure function of the ticket", async () => {
    const value = ticket();

    const first = await renderQrTicketImage(value);
    const second = await renderQrTicketImage(value);

    expect(Buffer.from(first.buffer).equals(Buffer.from(second.buffer))).toBe(true);
    expect(first.contentId).toBe(second.contentId);
  });

  test("produces a different image and CID for a different ticket", async () => {
    const first = await renderQrTicketImage(ticket("11111111-1111-1111-1111-111111111111"));
    const second = await renderQrTicketImage(ticket("22222222-2222-2222-2222-222222222222"));

    expect(first.contentId).not.toBe(second.contentId);
    expect(Buffer.from(first.buffer).equals(Buffer.from(second.buffer))).toBe(false);
  });

  test("stays readable at every error correction level", async () => {
    const value = ticket();

    for (const level of ["L", "M", "Q", "H"] as const) {
      const image = await renderQrTicketImage(value, { errorCorrectionLevel: level });

      expect(decode(image.buffer), level).toBe(value);
    }
  });

  test("grows with the token, proving the content is encoded", async () => {
    const short = await renderQrTicketImage(ticket("a"));
    const long = await renderQrTicketImage(ticket("a".repeat(64)));

    expect(long.buffer.byteLength).toBeGreaterThan(short.buffer.byteLength);
  });

  test("rejects an empty or whitespace-only ticket", async () => {
    await expect(renderQrTicketImage("")).rejects.toThrow(/QR ticket is required/);
    await expect(renderQrTicketImage("   ")).rejects.toThrow(/QR ticket is required/);
  });

  test("rejects a ticket beyond the encodable length", async () => {
    await expect(renderQrTicketImage("a".repeat(MAX_TICKET_LENGTH + 1))).rejects.toThrow(
      /at most 2331 characters/,
    );
  });

  test("rejects invalid render options", async () => {
    await expect(renderQrTicketImage(ticket(), { moduleSize: 1 })).rejects.toThrow(
      /moduleSize must be an integer of at least 2/,
    );
    await expect(renderQrTicketImage(ticket(), { moduleSize: 2.5 })).rejects.toThrow(
      /moduleSize must be an integer/,
    );
    await expect(renderQrTicketImage(ticket(), { margin: -1 })).rejects.toThrow(
      /margin must be an integer/,
    );
  });
});

describe("content id", () => {
  test("is deterministic and derived from the ticket", () => {
    expect(qrTicketCid(ticket())).toBe(qrTicketCid(ticket()));
    expect(qrTicketCid(ticket())).not.toBe(qrTicketCid(ticket("other-entry")));
  });

  test("is a safe cid token", () => {
    expect(qrTicketCid(ticket())).toMatch(/^qr-ticket-[0-9a-f]{24}$/);
  });

  test("matches the content id on the rendered image", async () => {
    const value = ticket();
    const image = await renderQrTicketImage(value);

    // A preview and the sent message must agree on the CID or the image does
    // not render in the recipient's client at all.
    expect(image.contentId).toBe(qrTicketCid(value));
  });
});

describe("renderQrTicketDataUrl", () => {
  test("returns a png data url that decodes to the ticket", async () => {
    const value = ticket();
    const dataUrl = await renderQrTicketDataUrl(value);

    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);

    const base64 = dataUrl.slice("data:image/png;base64,".length);
    expect(decode(new Uint8Array(Buffer.from(base64, "base64")))).toBe(value);
  });

  test("agrees with the buffer renderer on the same ticket", async () => {
    const value = ticket();

    const bufferImage = await renderQrTicketImage(value);
    const dataUrl = await renderQrTicketDataUrl(value);
    const fromDataUrl = new Uint8Array(
      Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"),
    );

    expect(Buffer.from(bufferImage.buffer).equals(Buffer.from(fromDataUrl))).toBe(true);
  });

  test("rejects an empty ticket", async () => {
    await expect(renderQrTicketDataUrl("  ")).rejects.toThrow(/QR ticket is required/);
  });
});
