import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { recordCheckIn } from "@/lib/services/checkin-service";

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof Response) {
    return authResult;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "We could not read that check-in. Please scan the ticket again." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "We could not read that check-in. Please scan the ticket again." },
      { status: 400 }
    );
  }

  const { eventId, ticketTokenOrCode } = body as Record<string, unknown>;

  try {
    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: "Event ID is required." },
        { status: 400 }
      );
    }

    if (!ticketTokenOrCode || typeof ticketTokenOrCode !== "string") {
      return NextResponse.json(
        { error: "Ticket code or QR token is required." },
        { status: 400 }
      );
    }

    const result = await recordCheckIn({
      eventId,
      ticketTokenOrCode,
      adminId: authResult.adminId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Check-in scan API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing check-in." },
      { status: 500 }
    );
  }
}
