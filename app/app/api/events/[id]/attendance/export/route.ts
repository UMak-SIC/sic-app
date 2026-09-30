import { requireAdmin } from "@/lib/auth/require-admin";
import { getEventAttendance, toAttendanceCsv } from "@/lib/services/attendance-service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) {
    return authorization;
  }

  const { id } = await params;
  const event = await getEventAttendance(id);

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  const csv = toAttendanceCsv(
    event.rosterEntries.map((entry) => ({
      name: entry.attendee.name,
      email: entry.attendee.displayEmail,
      studentId: entry.attendee.studentId,
      status: entry.status.toLowerCase() as "pending" | "attended" | "absent",
      arrivedAt: entry.arrivedAt,
    })),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.name.replaceAll('"', "")}-attendance.csv"`,
    },
  });
}
