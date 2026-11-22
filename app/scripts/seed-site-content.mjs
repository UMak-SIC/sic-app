import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Fills the public site with SIC's own content until the dashboards exist
// (SY-05, SY-08 in Sprint 4). Sources:
// - Mission and vision: 2026 Constitution and By-Laws, Article III, word for word.
// - Location: Article II, Section 2.
// - Membership steps: Article IV.
// - Working Committees: Article XI, Section 4, summarized in one line each, plus
//   the Development Team (PS-11.1).
// - Privacy Notice: a draft covering every heading PS-15.2 requires. It must be
//   reviewed by the UMak Data Protection Officer before go-live (PS-15.5).
//
// Safe to run again: it only fills fields that are still empty and only adds
// committees that do not exist yet, so it never overwrites dashboard edits.
//
// Run: DATABASE_URL=... pnpm site:seed

if (!process.env.DATABASE_URL) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

const siteContent = {
  homeStatement:
    "A student community at UMak's College of Computing and Information Sciences for mentorship, skill-building and research.",
  mission:
    "The mission of the Society of Innovative Computing shall be to establish a student community that empowers members through hands-on mentorship, practical skill-building, and professional growth opportunities, while fostering a research-driven environment that sparks continuous innovation.",
  vision:
    "The vision of the Society of Innovative Computing shall be to cultivate a thriving peer community of collaborative innovators who drive transformative contributions to the advancement of computing science and technology.",
  location:
    "College of Computing and Information Sciences Faculty Office, University of Makati",
  joinSteps: [
    "Be enrolled in any program of the College of Computing and Information Sciences, and not under academic probation or disciplinary suspension.",
    "Pay the local organization membership fee, collected by the CCIS Student Council officers during enrollment every semester.",
    "To join a Working Committee, apply when the Executive Committee recruits Working Members.",
  ],
  privacyNoticeMarkdown: `**Draft for review by the UMak Data Protection Officer. This notice is not yet in effect.**

The University of Makati Society of Innovative Computing (SIC) respects your privacy and follows the Data Privacy Act of 2012 (Republic Act No. 10173).

## What we collect

When SIC invites you to an event, we keep your name, student ID, email address, course, program and section. When you check in, we record the time you arrived.

## Why we collect it

We use this information only to send event invitations with your QR ticket and to keep attendance records for SIC events.

## Legal basis

The legal basis for this processing will be confirmed with the UMak Data Protection Officer before this notice takes effect.

## Who can see it

Only SIC officers on the dashboard allowlist: System Administrators, the Executive Committee, Event Heads for their own events, and Committee members, who can only view attendance.

## How long we keep it

We keep these records for five years. After that, they are deleted or anonymized automatically.

## Your rights

You may ask to see, correct or delete your information, object to its use, or file a complaint with the National Privacy Commission. To make a request, contact SIC through the details on our Contact page.

## UMak Data Protection Officer

The contact details of the UMak Data Protection Officer will be added after their review.`,
};

const committees = [
  {
    name: "Training and Mentorship Committee",
    description:
      "Gives members hands-on academic and technical mentorship, and guides participants during programs and events.",
  },
  {
    name: "Research and Development Committee",
    description:
      "Researches trends and focus areas for SIC, and finds challenges, competitions and growth opportunities for members.",
  },
  {
    name: "Creatives and Publication Committee",
    description:
      "Runs the social media and publications of SIC, and looks after its seals, logos and visual identity.",
  },
  {
    name: "External Affairs Committee",
    description:
      "Works with partners, sponsors and other organizations, and handles partnership agreements with the Executive Committee.",
  },
  {
    name: "Finance Committee",
    description:
      "Helps the Treasurer and Auditor keep financial records and prepare transparent reports and budgets.",
  },
  {
    name: "Logistics Committee",
    description:
      "Arranges venues, equipment, supplies and permits, and looks after the equipment and inventory of SIC.",
  },
  {
    name: "Development Team",
    description: "Builds and maintains the SIC website and event tools.",
  },
];

try {
  const existing = await prisma.siteContent.findUnique({ where: { singleton: true } });
  let filled = 0;

  if (!existing) {
    await prisma.siteContent.create({
      data: { ...siteContent, privacyNoticeUpdatedAt: new Date() },
    });
    filled = Object.keys(siteContent).length;
  } else {
    const missing = {};
    for (const [key, value] of Object.entries(siteContent)) {
      const current = existing[key];
      const empty = current === null || (Array.isArray(current) && current.length === 0);
      if (empty) missing[key] = value;
    }
    if (missing.privacyNoticeMarkdown) missing.privacyNoticeUpdatedAt = new Date();
    if (Object.keys(missing).length > 0) {
      await prisma.siteContent.update({ where: { singleton: true }, data: missing });
    }
    filled = Object.keys(missing).length;
  }

  let added = 0;
  for (const [index, committee] of committees.entries()) {
    const found = await prisma.committee.findUnique({ where: { name: committee.name } });
    if (!found) {
      await prisma.committee.create({ data: { ...committee, sortOrder: index + 1 } });
      added += 1;
    }
  }

  console.log(`Site content: ${filled} field(s) filled. Committees: ${added} added.`);
} finally {
  await prisma.$disconnect();
}
