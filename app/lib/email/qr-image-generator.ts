import "server-only";

import { createHash } from "node:crypto";

import QRCode from "qrcode";

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
