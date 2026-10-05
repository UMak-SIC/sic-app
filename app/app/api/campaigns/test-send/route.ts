import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { compileMarkdown } from "@/lib/email/markdown-compiler";
import { renderQrTicketPassImage } from "@/lib/email/qr-image-generator";
import { createProviderDispatch } from "@/lib/queue/providers";
import type { OutboundMessage } from "@/lib/queue/providers/types";
import { validateEmail } from "@/lib/validation/attendee-validation";
import { EmailProvider } from "@prisma/client";

/**
 * Sends one message to one address, immediately (TSK-0605, US-17).
 *
 * The point of a test send is to answer "does this reach a real inbox, and does
 * it look right", so this dispatches synchronously and reports what the provider
 * actually said. It deliberately does **not** create a `QueueJob`: a test send
 * must never consume queue capacity, compete with real campaign traffic for the
 * daily provider quota, or leave a delivery record that looks like a roster
 * delivery. Nothing in this path writes to the database.
 *
 * Provider selection is fixed to Brevo, the primary provider. The dual-provider
 * failover decision belongs to the engine in TSK-0705, and a test send is exactly
 * the wrong place to start failing over: an operator testing a draft should see
 * the primary's real answer, including its failures.
 *
 * The body goes through `compileMarkdown` rather than being passed as raw HTML,
 * so a test send previews exactly what a campaign would send. That is also the
 * only production caller TSK-0601 has.
 */

const DEFAULT_SUBJECT = "UMak SIC test email";
const MAX_BODY_CHARACTERS = 100_000;

type TestSendBody = {
  to?: unknown;
  subject?: unknown;
  markdown?: unknown;
  includePracticePass?: unknown;
};


function readString(value: unknown, maxLength: number): string | null {
  if (value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return null;
  }

  return value.length > maxLength ? null : value;
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof Response) {
    return authResult;
  }

  let body: TestSendBody;
  try {
    body = (await request.json()) as TestSendBody;
  } catch {
    return NextResponse.json(
      { error: "We could not read that request. Try again." },
      { status: 400 }
    );
  }

  const to = readString(body.to, 320);
  const subject = readString(body.subject, 200);
  const markdown = readString(body.markdown, MAX_BODY_CHARACTERS);

  if (to === null || subject === null || markdown === null) {
    return NextResponse.json(
      { error: "That test email had something we could not read. Check it and try again." },
      { status: 400 }
    );
  }

  if (body.includePracticePass !== undefined && typeof body.includePracticePass !== "boolean") {
    return NextResponse.json(
      { error: "That test email had something we could not read. Check it and try again." },
      { status: 400 }
    );
  }

  // Reuses the attendee validator so a test send rejects the same addresses the
  // registry would, rather than accepting something and letting the provider
  // bounce it minutes later.
  const email = validateEmail(to);
  if (!email.valid) {
    return NextResponse.json({ error: email.error }, { status: 400 });
  }

  const finalSubject = subject.trim() || DEFAULT_SUBJECT;

  let compiled: string;
  let attachments: OutboundMessage["attachments"];
  try {
    compiled = compileMarkdown(markdown.trim() || "_(empty test message)_");
    if (body.includePracticePass) {
      const pass = await renderQrTicketPassImage({
        ticket: "practice-email-layout-only",
        attendeeName: "Practice recipient",
        studentId: "PRACTICE-ONLY",
        eventName: "Practice email",
      });
      attachments = [{
        name: "practice-check-in-pass.png",
        content: Buffer.from(pass.buffer).toString("base64"),
      }];
    }
  } catch {
    // compileMarkdown needs the storage endpoint to pin image hosts to, and
    // throws without it. That is a deployment misconfiguration rather than
    // anything the operator typed, so it gets its own message instead of a 500.
    return NextResponse.json(
      {
        error:
          "Test email is unavailable right now: the service is not fully configured. Ask an administrator.",
      },
      { status: 503 }
    );
  }

  const message: OutboundMessage = {
    to: email.displayEmail,
    subject: finalSubject,
    html: compiled,
    attachments,
  };

  const dispatch = createProviderDispatch({
    resolveMessage: async () => message,
  });

  const attempt = await dispatch(
    {
      id: "test-send",
      deliveryId: "test-send",
      idempotencyKey: crypto.randomUUID(),
      retryCount: 0,
      maxRetries: 0,
      scheduledAt: new Date(),
      lockExpiresAt: new Date(),
    },
    EmailProvider.BREVO
  );

  if (!attempt.succeeded) {
    // The provider's own reason is already operator-facing: the adapters phrase
    // it as a provider configuration problem rather than surfacing a raw body.
    return NextResponse.json(
      {
        error: attempt.errorMessage ?? "The email could not be sent.",
        provider: EmailProvider.BREVO,
        httpStatus: attempt.httpStatus,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      sent: true,
      provider: EmailProvider.BREVO,
      to: email.displayEmail,
      subject: finalSubject,
      providerMessageId: attempt.providerMessageId,
    },
    { status: 200 }
  );
}
