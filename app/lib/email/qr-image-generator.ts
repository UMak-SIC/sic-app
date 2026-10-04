import "server-only";

import { createHash } from "node:crypto";

import QRCode from "qrcode";
import sharp from "sharp";

// Email clients render PNG reliably and largely ignore SVG, so the image format
// is fixed rather than configurable. JPEG and WebP are also unsafe: some clients
// re-encode or block them for a `cid:` source.
const MEDIA_TYPE = "image/png" as const;

// A signed ticket is roughly 220 characters. Byte mode at error correction M
// holds 2331 bytes at the largest version, so the headroom is large; this bound
// exists to turn an unexpectedly long token into a clear error instead of a
// silently corrupt or unreadable code.
export const MAX_TICKET_LENGTH = 2331;

export type QrTicketImageOptions = {
  /**
   * Error correction level. `M` tolerates roughly 15% damage, which suits a
   * ticket that may be printed, folded, or scanned off a screen in poor light.
   */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  /** Pixels per module. Must be an integer of at least 2. */
  moduleSize?: number;
  margin?: number;
};

export type QrTicketImage = {
  buffer: Uint8Array;
  mediaType: typeof MEDIA_TYPE;
  /**
   * Content-ID for a `cid:` reference. Derived from the ticket so a preview and
   * the sent message reference the same image, which they must for the image to
   * render at all.
   */
  contentId: string;
};

const DEFAULT_ERROR_CORRECTION: "L" | "M" | "Q" | "H" = "M";
const DEFAULT_MODULE_SIZE = 8;
const DEFAULT_MARGIN = 4;

function requireTicket(ticket: string): string {
  const trimmed = ticket.trim();

  if (!trimmed) {
    throw new Error("A QR ticket is required to render an image.");
  }

  if (trimmed.length > MAX_TICKET_LENGTH) {
    throw new Error(
      `A QR ticket must be at most ${MAX_TICKET_LENGTH} characters to render.`,
    );
  }

  return trimmed;
}

function validateOptions(options: QrTicketImageOptions) {
  const moduleSize = options.moduleSize ?? DEFAULT_MODULE_SIZE;

  if (!Number.isInteger(moduleSize) || moduleSize < 2) {
    throw new Error("moduleSize must be an integer of at least 2.");
  }

  const margin = options.margin ?? DEFAULT_MARGIN;

  if (!Number.isInteger(margin) || margin < 0) {
    throw new Error("margin must be an integer of at least 0.");
  }
}

// Deterministic in the ticket, so the same ticket always yields the same CID.
function contentIdFor(ticket: string): string {
  const digest = createHash("sha256").update(ticket, "utf8").digest("hex");

  return `qr-ticket-${digest.slice(0, 24)}`;
}

// `toBuffer` and `toDataURL` spell the output type differently: "png" versus
// "image/png". Reusing one builder for both silently selects the callback
// overload of toDataURL, so they are kept separate.
function bufferRenderOptions(options: QrTicketImageOptions) {
  validateOptions(options);

  return {
    type: "png" as const,
    errorCorrectionLevel: options.errorCorrectionLevel ?? DEFAULT_ERROR_CORRECTION,
    margin: options.margin ?? DEFAULT_MARGIN,
    scale: options.moduleSize ?? DEFAULT_MODULE_SIZE,
  };
}

function dataUrlRenderOptions(options: QrTicketImageOptions) {
  validateOptions(options);

  return {
    type: "image/png" as const,
    errorCorrectionLevel: options.errorCorrectionLevel ?? DEFAULT_ERROR_CORRECTION,
    margin: options.margin ?? DEFAULT_MARGIN,
    scale: options.moduleSize ?? DEFAULT_MODULE_SIZE,
  };
}

/**
 * Renders a signed ticket as a PNG for embedding in a campaign email.
 *
 * US-15: the image encodes the opaque signed ticket and nothing else, so it
 * reveals no attendee identity. Verification happens when the ticket is scanned
 * (TSK-0902), not here, so this function does not need the signing secret and
 * stays usable for a preview without a second signing path.
 */
export async function renderQrTicketImage(
  ticket: string,
  options: QrTicketImageOptions = {},
): Promise<QrTicketImage> {
  const value = requireTicket(ticket);

  const buffer = await QRCode.toBuffer(value, bufferRenderOptions(options));

  return {
    buffer: new Uint8Array(buffer),
    mediaType: MEDIA_TYPE,
    contentId: contentIdFor(value),
  };
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

/** Renders a scan-safe QR into the recipient's downloadable boarding pass. */
export async function renderQrTicketPassImage({
  ticket,
  attendeeName,
  studentId,
  eventName,
}: {
  ticket: string;
  attendeeName: string;
  studentId: string;
  eventName: string;
}): Promise<QrTicketImage> {
  const qr = await renderQrTicketImage(ticket);
  const pass = Buffer.from(`<svg width="840" height="320" viewBox="0 0 840 320" xmlns="http://www.w3.org/2000/svg"><rect width="840" height="320" rx="16" fill="#fbfdfd"/><rect x="1" y="1" width="838" height="318" rx="15" fill="none" stroke="#cfe0e0" stroke-width="2"/><path d="M558 1V319" stroke="#cfe0e0" stroke-width="2" stroke-dasharray="5 6"/><text x="40" y="56" fill="#12333a" font-family="Arial, sans-serif" font-size="22" font-weight="700">UMak SIC Pass</text><text x="40" y="84" fill="#607579" font-family="Arial, sans-serif" font-size="15">${escapeXml(eventName)}</text><text x="40" y="132" fill="#607579" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">ATTENDEE NAME</text><text x="40" y="160" fill="#12333a" font-family="Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(attendeeName)}</text><text x="40" y="204" fill="#607579" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">STUDENT ID NUMBER</text><text x="40" y="230" fill="#12333a" font-family="Arial, sans-serif" font-size="16" font-weight="700">${escapeXml(studentId)}</text><text x="40" y="278" fill="#607579" font-family="Arial, sans-serif" font-size="13">Present this pass at check-in.</text><rect x="600" y="43" width="198" height="198" rx="12" fill="#ffffff" stroke="#cfe0e0" stroke-width="2"/><text x="699" y="278" fill="#087f8c" font-family="Arial, sans-serif" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="1.5">CHECK-IN PASS</text></svg>`);
  const image = await sharp(pass)
    .composite([{
      input: await sharp(qr.buffer).resize(170, 170, { kernel: sharp.kernel.nearest }).png().toBuffer(),
      left: 614,
      top: 57,
    }])
    .png()
    .toBuffer();

  return { ...qr, buffer: new Uint8Array(image) };
}

/**
 * Same image as a `data:` URL, for clients that will not resolve a `cid:`
 * reference. Preferred for a composer preview, where there is no message
 * structure to attach the image to.
 */
export async function renderQrTicketDataUrl(
  ticket: string,
  options: QrTicketImageOptions = {},
): Promise<string> {
  const value = requireTicket(ticket);

  return QRCode.toDataURL(value, dataUrlRenderOptions(options));
}

/** The `cid:` reference an email body uses to inline a rendered ticket. */
export function qrTicketCid(ticket: string): string {
  return contentIdFor(requireTicket(ticket));
}
