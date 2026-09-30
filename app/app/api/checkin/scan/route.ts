import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { recordCheckIn } from "@/lib/services/checkin-service";

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { eventId, ticketTokenOrCode } = body;

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
