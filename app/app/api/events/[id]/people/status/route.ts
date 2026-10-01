import { DeliveryStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getPrismaClient } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const authorization = await requireAdmin();
  if (authorization instanceof Response) return authorization;

  const event = await getPrismaClient().event.findUnique({
    where: { id: (await params).id },
    select: {
      rosterEntries: {
        orderBy: { attendee: { name: "asc" } },
        select: {
          id: true,
          status: true,
          arrivedAt: true,
          attendee: {
            select: { id: true, name: true, studentId: true, displayEmail: true },
          },
          deliveries: {
            where: { status: DeliveryStatus.SENT },
            select: { sentAt: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!event) return Response.json({ error: "Event not found." }, { status: 404 });

  return Response.json({
    people: event.rosterEntries.map((entry) => ({
      id: entry.id,
      name: entry.attendee.name,
      studentId: entry.attendee.studentId,
      email: entry.attendee.displayEmail,
      attendanceStatus: entry.status,
      attendedAt: entry.arrivedAt,
      ticketSentAt: entry.deliveries[0]?.sentAt ?? null,
    })),
  });
}
