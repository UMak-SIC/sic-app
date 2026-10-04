import "server-only";

import { compileMarkdown } from "@/lib/email/markdown-compiler";
import { renderQrTicketPassImage } from "@/lib/email/qr-image-generator";
import { formatOrganizationDate } from "@/lib/events/organization-timezone";
import { getPrismaClient } from "@/lib/prisma";
import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";
import type { OutboundMessage, ResolveMessage } from "@/lib/queue/providers/types";
import { signQrTicket } from "@/lib/security/qr-signer";
import { getNeonStorageClient } from "@/lib/storage/neon-storage-client";
import { GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Turns a claimed queue job into the message a provider should send.
 *
 * This is the composition half that the provider adapters deliberately left out.
 * `ClaimedQueueJob` carries only a `deliveryId`, so everything an email needs —
 * the recipient, the subject, the body, the event details a campaign body
 * interpolates — has to be read here, at dispatch time, from the delivery's own
 * relations.
 *
 * The body is compiled through `compileMarkdown`, the same path the composer
 * preview and the test send use, so what goes out is what was previewed.
 */

/** Matches `{{ token }}` with tolerant inner whitespace. */
const TEMPLATE_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export type TemplateValues = Record<string, string>;

export type TemplateResult = {
  text: string;
  /** Tokens with no value, in the order they were first seen. */
  unknownTokens: string[];
};

type StoredCampaignAsset = {
  originalFilename: string;
  objectKey: string;
  storageBucket: "PRIVATE_IMAGES" | "PUBLIC_IMAGES" | null;
};

type StoredCampaignAssetBinding = {
  role: "INLINE" | "ATTACHMENT";
  asset: StoredCampaignAsset;
};

async function loadAttachments(assets: StoredCampaignAsset[]): Promise<NonNullable<OutboundMessage["attachments"]>> {
  return Promise.all(assets.map(async (asset) => {
    if (!asset.storageBucket) throw new Error(`Uploaded file ${asset.originalFilename} has no storage location.`);
    const response = await getNeonStorageClient().send(new GetObjectCommand({
      Bucket: asset.storageBucket === "PUBLIC_IMAGES" ? "public-images" : "private-images",
      Key: asset.objectKey,
    })) as { Body?: { transformToByteArray?: () => Promise<Uint8Array> } };
    const bytes = await response.Body?.transformToByteArray?.();
    if (!bytes) throw new Error(`Uploaded file ${asset.originalFilename} could not be read.`);
    return { name: asset.originalFilename, content: Buffer.from(bytes).toString("base64") };
  }));
}

function publicAssetUrl(asset: StoredCampaignAsset): string {
  if (asset.storageBucket !== "PUBLIC_IMAGES") {
    throw new Error(`Campaign banner ${asset.originalFilename} is not publicly available.`);
  }

  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();
  if (!endpoint) throw new Error("AWS_ENDPOINT_URL_S3 is required to render campaign banners.");

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("AWS_ENDPOINT_URL_S3 must be a valid URL.");
  }

  url.pathname = `/public-images/${asset.objectKey.split("/").map(encodeURIComponent).join("/")}`;
  return url.toString();
}

function prependInlineBanners(markdown: string, bindings: StoredCampaignAssetBinding[]): string {
  const banners = bindings
    .filter((binding) => binding.role === "INLINE")
    .map((binding) => `<img src="${publicAssetUrl(binding.asset)}" alt="Campaign banner" height="160">`);

  return banners.length > 0 ? `${banners.join("\n\n")}\n\n${markdown}` : markdown;
}

/**
 * Substitutes `{{ token }}` placeholders.
 *
 * A token with no value is removed rather than left in place. Leaving it would
 * put a literal `{{venue}}` in front of an attendee, which is the kind of thing
 * that only surfaces after a real send. The names are returned so a caller can
 * surface them, and the composer can validate against the supported set before
 * saving.
 *
 * "No value" covers two cases that are deliberately treated alike: a token the
 * schema has no column for, and a token whose column is null for this delivery —
 * an event with no `venue`, an attendee with no `section`. Substituting an empty
 * string for the second case would leave a dangling "in the " in the sentence,
 * and reporting it lets the operator see that the event is missing a venue
 * rather than wondering why the email reads oddly.
 *
 * The supported set is exactly the fields the schema can supply. It grew to
 * include `venue` and `section` once those columns existed (#110, #109).
 */
export function applyTemplate(
  markdown: string,
  values: TemplateValues
): TemplateResult {
  const unknownTokens: string[] = [];

  const text = markdown.replace(TEMPLATE_PATTERN, (_match, token: string) => {
    // The pattern matches case-insensitively so `{{STUDENT_NAME}}` is recognised
    // rather than treated as unknown, but the lookup is normalised too — matching
    // leniently and then looking up the original casing would strip a token the
    // author clearly meant. Unknown tokens are reported as the author wrote them.
    const normalizedToken = token.toLowerCase();
    // The QR is delivered as a PNG attachment. The editor token is retained for
    // old drafts, but must never leak its implementation marker into the email.
    if (normalizedToken === "qr_ticket_pass") return "";

    const value = values[normalizedToken];

    if (value === undefined || value === "") {
      if (!unknownTokens.includes(token)) {
        unknownTokens.push(token);
      }

      return "";
    }

    return value;
  });

  return { text, unknownTokens };
}

/**
 * Builds the values a campaign body can interpolate.
 *
 * `attendee.displayEmail` is the address used deliberately: DMA-02 keeps
 * `normalizedEmail` for uniqueness and matching, and `displayEmail` for what a
 * human sees and what gets sent.
 *
 * `section` and `venue` are omitted entirely when null, so `applyTemplate`
 * reports them as having no value rather than substituting an empty string.
 */
export function buildTemplateValues({
  attendee,
  event,
}: {
  attendee: { name: string; studentId: string; section: string | null };
  event: { name: string; startsAt: Date; venue: string | null };
}): TemplateValues {
  return {
    student_name: attendee.name,
    student_id: attendee.studentId,
    ...(attendee.section ? { section: attendee.section } : {}),
    event_name: event.name,
    event_time: formatOrganizationDate(event.startsAt),
    ...(event.venue ? { venue: event.venue } : {}),
  };
}

/**
 * The `ResolveMessage` the provider adapters take.
 *
 * A missing delivery or roster entry throws. That is deliberate: the adapters
 * catch it and return a failed attempt, which the delivery logger records and the
 * queue retries or dead-letters. Swallowing it would report a successful send
 * for a message that was never addressed.
 */
export function createDeliveryMessageResolver(): ResolveMessage {
  return async (job: ClaimedQueueJob): Promise<OutboundMessage> => {
    const delivery = await getPrismaClient().emailDelivery.findUnique({
      where: { id: job.deliveryId },
      select: {
        id: true,
        campaign: {
          select: {
            subject: true,
            markdown: true,
            event: { select: { id: true, name: true, startsAt: true, endsAt: true, venue: true } },
            assets: { select: { role: true, asset: { select: { originalFilename: true, objectKey: true, storageBucket: true } } } },
          },
        },
        rosterEntry: {
          select: {
            id: true,
            attendee: {
              select: {
                name: true,
                studentId: true,
                displayEmail: true,
                section: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      throw new Error(`Delivery ${job.deliveryId} no longer exists.`);
    }

    const { campaign, rosterEntry } = delivery;

    if (!rosterEntry) {
      throw new Error(`Delivery ${delivery.id} has no roster entry to address.`);
    }

    const { attendee } = rosterEntry;

    if (!attendee.displayEmail.trim()) {
      throw new Error(`Delivery ${delivery.id} has no recipient address.`);
    }

    const { text, unknownTokens } = applyTemplate(
      campaign.markdown,
      buildTemplateValues({ attendee, event: campaign.event })
    );

    // Worth logging rather than swallowing: a token with no value means either the
    // author used something the schema cannot supply, or the event or attendee is
    // missing an attribute the body assumes. Both are invisible in the sent email
    // otherwise, and the operator has no other way to learn the body is wrong.
    if (unknownTokens.length > 0) {
      console.warn(
        `Delivery ${delivery.id} to ${attendee.displayEmail} dropped unresolved placeholder(s): ${unknownTokens.join(", ")}`,
      );
    }

    const ticket = signQrTicket({
      eventId: campaign.event.id,
      rosterEntryId: rosterEntry.id,
      startsAt: campaign.event.startsAt,
      endsAt: campaign.event.endsAt,
    });
    const qrImage = await renderQrTicketPassImage({
      ticket,
      attendeeName: attendee.name,
      studentId: attendee.studentId,
      eventName: campaign.event.name,
    });
    const html = compileMarkdown(
      prependInlineBanners(text.replace(/\bQR_TICKET_PASS\b/g, ""), campaign.assets),
    );

    return {
      to: attendee.displayEmail,
      subject: campaign.subject,
      html,
      attachments: [
        ...(await loadAttachments(
          campaign.assets
            .filter((binding) => binding.role === "ATTACHMENT")
            .map((binding) => binding.asset),
        )),
        {
          name: `${attendee.studentId}-check-in-pass.png`,
          content: Buffer.from(qrImage.buffer).toString("base64"),
        },
      ],
    };
  };
}
