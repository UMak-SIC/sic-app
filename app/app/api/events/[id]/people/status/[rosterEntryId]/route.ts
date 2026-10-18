import { requireAdmin } from "@/lib/auth/require-admin";
import {
  updateAttendanceRecord,
  type AttendanceRecord,
} from "@/lib/services/checkin-service";

type RouteContext = { params: Promise<{ id: string; rosterEntryId: string }> };

const ATTENDANCE_STATUSES = ["ATTENDED", "ABSENT", "PENDING"] as const;

export async function PATCH(request: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const { id: eventId, rosterEntryId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the attendance record as JSON." }, { status: 400 });
  }

  const input = (body ?? {}) as { status?: unknown; arrivedAt?: unknown };

  if (typeof input.status !== "string" || !(ATTENDANCE_STATUSES as readonly string[]).includes(input.status)) {
    return Response.json(
      { error: "Choose a valid attendance record: attended, absent, or not recorded." },
      { status: 400 },
    );
  }
  const status = input.status as (typeof ATTENDANCE_STATUSES)[number];

  let arrivedAt: Date | null | undefined;
  if (typeof input.arrivedAt === "string") {
    const parsed = new Date(input.arrivedAt);
    if (Number.isNaN(parsed.getTime())) {
      return Response.json({ error: "Choose a valid arrival time." }, { status: 400 });
    }
    if (parsed.getTime() > Date.now()) {
      return Response.json({ error: "Arrival time cannot be in the future." }, { status: 400 });
    }
    arrivedAt = parsed;
  } else if (input.arrivedAt === null) {
    arrivedAt = null;
  }

  const record: AttendanceRecord | null = await updateAttendanceRecord({
    eventId,
    rosterEntryId,
    status,
    arrivedAt,
    updatedByAdminId: authorization.adminId,
  });

  if (!record) return Response.json({ error: "Person not found for this event." }, { status: 404 });

  // Return only the edited fields so the client can update its row in place.
  return Response.json({
    entry: { id: rosterEntryId, attendanceStatus: record.status, attendedAt: record.arrivedAt },
  });
}
