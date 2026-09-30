import "server-only";

import { compileMarkdown } from "@/lib/email/markdown-compiler";
import { formatOrganizationDate } from "@/lib/events/organization-timezone";
import { getPrismaClient } from "@/lib/prisma";
import type { ClaimedQueueJob } from "@/lib/queue/claim-jobs";
import type { OutboundMessage, ResolveMessage } from "@/lib/queue/providers/types";

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

/**
 * Substitutes `{{ token }}` placeholders.
 *
 * An unknown token is removed rather than left in place. Leaving it would put a
 * literal `{{venue}}` in front of an attendee, which is the kind of thing that
 * only surfaces after a real send. The names are returned so a caller can surface
 * them, and the composer can validate against the supported set before saving.
 *
 * The supported set is deliberately small: it is exactly the fields the schema
 * can supply. `venue` is not among them, because `Event` has no venue column, so
 * a campaign body that interpolates one gets it stripped rather than invented.
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
    const value = values[token.toLowerCase()];

    if (value === undefined) {
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
 */
export function buildTemplateValues({
  attendee,
  event,
}: {
  attendee: { name: string; studentId: string };
  event: { name: string; startsAt: Date };
}): TemplateValues {
  return {
    student_name: attendee.name,
    student_id: attendee.studentId,
    event_name: event.name,
    event_time: formatOrganizationDate(event.startsAt),
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
            event: { select: { name: true, startsAt: true } },
          },
        },
        rosterEntry: {
          select: {
            attendee: {
              select: { name: true, studentId: true, displayEmail: true },
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

    const { text } = applyTemplate(
      campaign.markdown,
      buildTemplateValues({ attendee, event: campaign.event })
    );

    return {
      to: attendee.displayEmail,
      subject: campaign.subject,
      html: compileMarkdown(text),
    };
  };
}
