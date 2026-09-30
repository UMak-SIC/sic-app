import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, EventStatus, RosterEntryStatus } from "@prisma/client";
import ws from "ws";

/**
 * Seeds a small attendee registry so the directory has something real to read.
 *
 * This is development data, not production. It is idempotent — every row is
 * upserted on its natural key — so it can be re-run after adding a person
 * without duplicating anyone.
 *
 * It also creates events and roster entries, because the directory's per-attendee
 * event list and attendance rate are derived from `event_roster_entries`. An
 * attendee with no roster shows a rate of 0 and no badges, which is a valid state
 * but a poor thing to develop against.
 *
 * Requires the same administrator as `bootstrap-admin.mjs`, because an event must
 * name the administrator who created it.
 */

const requiredEnvironment = ["DATABASE_URL", "ADMIN_NEON_AUTH_USER_ID"];
const missing = requiredEnvironment.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

const createdById = process.env.ADMIN_NEON_AUTH_USER_ID;

const EVENTS = [
  {
    name: "General Assembly 2026",
    details: "The annual general assembly for all CCIS students.",
    venue: "Audio Visual Room",
    startsAt: new Date("2026-10-17T06:00:00.000Z"),
    endsAt: new Date("2026-10-17T10:00:00.000Z"),
    status: EventStatus.PUBLISHED,
  },
  {
    name: "Cloud Computing 101",
    details: "A hands-on introduction to cloud infrastructure.",
    venue: null,
    startsAt: new Date("2026-10-23T06:00:00.000Z"),
    endsAt: new Date("2026-10-23T09:00:00.000Z"),
    status: EventStatus.PUBLISHED,
  },
  {
    name: "UX Sprint Workshop",
    details: "A weekend sprint on research and prototyping.",
    venue: "Innovation Lab",
    startsAt: new Date("2026-11-05T01:00:00.000Z"),
    endsAt: new Date("2026-11-05T09:00:00.000Z"),
    status: EventStatus.DRAFT,
  },
];

// `attended` lists the events each person actually turned up to. Everyone else
// gets a PENDING roster entry, which is the state a real roster is in before the
// event happens, so the directory shows a mix rather than a uniform 100%.
const ATTENDEES = [
  { name: "Andrea Santos", studentId: "2023-00182", email: "andrea.santos@umak.edu.ph", course: "BSIT", program: "BS Information Technology", section: "BSIT-2A", attended: [0, 1] },
  { name: "Miguel Dela Cruz", studentId: "2023-00491", email: "miguel.delacruz@umak.edu.ph", course: "BSCS", program: "BS Computer Science", section: "BSCS-2B", attended: [0] },
  { name: "Bianca Flores", studentId: "2023-00612", email: "bianca.flores@umak.edu.ph", course: "BSINS", program: "BS Information Systems", section: "BSINS-1A", attended: [0, 1, 2] },
  { name: "Joshua Ramos", studentId: "2022-01934", email: "joshua.ramos@umak.edu.ph", course: "BSIT", program: "BS Information Technology", section: "BSIT-3C", attended: [2] },
  { name: "Patricia Reyes", studentId: "2023-00823", email: "patricia.reyes@umak.edu.ph", course: "BSCS", program: "BS Computer Science", section: "BSCS-1D", attended: [] },
  { name: "Diego Mendoza", studentId: "2024-00471", email: "diego.mendoza@umak.edu.ph", course: "BSINS", program: "BS Information Systems", section: "BSINS-2B", attended: [0] },
  { name: "Sofia Aquino", studentId: "2024-00712", email: "sofia.aquino@umak.edu.ph", course: "BSIT", program: "BS Information Technology", section: "BSIT-1A", attended: [0, 1, 2] },
  { name: "Gabriel Tan", studentId: "2023-01188", email: "gabriel.tan@umak.edu.ph", course: "BSCS", program: "BS Computer Science", section: "BSCS-3A", attended: [0, 1] },
  { name: "Hannah Lim", studentId: "2024-00255", email: "hannah.lim@umak.edu.ph", course: "BSINS", program: "BS Information Systems", section: "BSINS-1C", attended: [1] },
  { name: "Nathaniel Cruz", studentId: "2022-01640", email: "nathaniel.cruz@umak.edu.ph", course: "BSIT", program: "BS Information Technology", section: "BSIT-4A", attended: [0, 2] },
  { name: "Grace Villamor", studentId: "2023-01402", email: "grace.villamor@umak.edu.ph", course: "BSCS", program: "BS Computer Science", section: "BSCS-2C", attended: [0] },
  { name: "Carlo Bautista", studentId: "2024-00933", email: "carlo.bautista@umak.edu.ph", course: "BSIT", program: "BS Information Technology", section: "BSIT-1B", attended: [2] },
];

try {
  const admin = await prisma.admin.findUnique({
    where: { neonAuthUserId: createdById },
    select: { neonAuthUserId: true },
  });

  if (!admin) {
    throw new Error(
      "No administrator matches ADMIN_NEON_AUTH_USER_ID. Run `pnpm admin:bootstrap` first.",
    );
  }

  const events = [];

  for (const event of EVENTS) {
    events.push(
      await prisma.event.upsert({
        // Events have no natural unique key, so the name stands in for one. A real
        // event title is not guaranteed unique in production, which is why this is
        // development-only seed data.
        where: { id: `seed-event-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
        create: { ...event, createdById },
        update: { ...event },
        select: { id: true, name: true },
      }),
    );
  }

  let attendeeCount = 0;
  let rosterCount = 0;

  for (const person of ATTENDEES) {
    const attendee = await prisma.attendee.upsert({
      where: { studentId: person.studentId },
      create: {
        normalizedEmail: person.email.toLowerCase(),
        displayEmail: person.email,
        name: person.name,
        studentId: person.studentId,
        course: person.course,
        program: person.program,
        section: person.section,
      },
      update: {
        name: person.name,
        displayEmail: person.email,
        normalizedEmail: person.email.toLowerCase(),
        course: person.course,
        program: person.program,
        section: person.section,
      },
      select: { id: true },
    });

    attendeeCount += 1;

    for (const [index, event] of events.entries()) {
      const attended = person.attended.includes(index);

      await prisma.eventRosterEntry.upsert({
        where: { eventId_attendeeId: { eventId: event.id, attendeeId: attendee.id } },
        create: {
          eventId: event.id,
          attendeeId: attendee.id,
          status: attended ? RosterEntryStatus.ATTENDED : RosterEntryStatus.PENDING,
          // Only an attended entry can have a check-in time, so an unarrived
          // attendee is not given one.
          arrivedAt: attended ? events[index].startsAt : null,
        },
        update: {
          status: attended ? RosterEntryStatus.ATTENDED : RosterEntryStatus.PENDING,
          arrivedAt: attended ? events[index].startsAt : null,
        },
      });

      rosterCount += 1;
    }
  }

  console.log(`Seeded ${events.length} events, ${attendeeCount} attendees, ${rosterCount} roster entries.`);
  console.log(`Two attendees are on no roster, so the directory shows a 0% attendance rate.`);
} finally {
  await prisma.$disconnect();
}
