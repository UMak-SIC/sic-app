import { isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

// Importing a page pulls in Next and the icon set; the first import is slow.
vi.setConfig({ testTimeout: 30_000 });

/** Every string in a rendered element tree: text and string props such as href. */
function textOf(node: unknown, seen = new Set<unknown>()): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return `${node} `;
  if (Array.isArray(node)) return node.map((child) => textOf(child, seen)).join("");
  if (isValidElement(node)) {
    if (seen.has(node)) return "";
    seen.add(node);
    const props = node.props as Record<string, unknown>;
    return Object.entries(props)
      .map(([key, value]) => (key === "children" ? textOf(value as ReactNode, seen) : typeof value === "string" ? `${value} ` : ""))
      .join("");
  }
  return "";
}

const content = vi.hoisted(() => ({
  getSiteContent: vi.fn(),
  listFaqs: vi.fn(),
  listPublishedNews: vi.fn(),
}));
const events = vi.hoisted(() => ({ getNextEvent: vi.fn(), getPublicEvent: vi.fn() }));
const notFound = vi.hoisted(() => vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
}));

vi.mock("@/lib/public-site/content", () => content);
vi.mock("@/lib/public-site/events", () => events);
vi.mock("next/navigation", () => ({ notFound }));

const EMPTY_SITE = {
  homeStatement: null,
  mission: null,
  vision: null,
  history: null,
  adviser: null,
  joinSteps: [],
  membershipFormLocation: null,
  contactEmail: null,
  location: null,
  socialLinks: [],
  privacyNoticeHtml: null,
  privacyNoticeUpdatedAt: null,
};

beforeEach(() => {
  vi.stubEnv("ORGANIZATION_TIMEZONE", "Asia/Manila");
  content.getSiteContent.mockResolvedValue(EMPTY_SITE);
  content.listFaqs.mockResolvedValue([]);
  content.listPublishedNews.mockResolvedValue({ posts: [], total: 0 });
  events.getNextEvent.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

test("Home shows plain messages when nothing is posted and hides the FAQ section", async () => {
  const { default: HomePage } = await import("@/app/(public)/page");
  const page = textOf(await HomePage());

  expect(page).toContain("No upcoming events yet.");
  expect(page).toContain("No news has been posted yet.");
  expect(page).not.toContain("Questions students ask");
  expect(content.listFaqs).toHaveBeenCalledWith({ featuredOnly: true });
  expect(content.listPublishedNews).toHaveBeenCalledWith(1, 3);
});

test("Home shows featured FAQs with a link to the full list", async () => {
  content.listFaqs.mockResolvedValue([{ id: "f1", question: "Who can join?", answerHtml: "<p>Any CCIS student.</p>" }]);
  const { default: HomePage } = await import("@/app/(public)/page");
  const page = textOf(await HomePage());

  expect(page).toContain("Questions students ask");
  expect(page).toContain("/join#faqs");
});

const baseEvent = {
  id: "9fdcd48a-170a-4af7-862e-a511ad9d7b94",
  name: "Hackathon",
  venue: "HPSB 507",
  theme: null,
  startsAt: new Date("2026-12-05T01:00:00.000Z"),
  endsAt: new Date("2026-12-05T09:00:00.000Z"),
  registrationLink: "https://forms.example/hack",
  coverUrl: null,
  hasSdeVideo: false,
  details: "Build something.",
  sdeVideos: [],
  photos: [],
};

test("an upcoming event offers registration and never an SDE section", async () => {
  events.getPublicEvent.mockResolvedValue({ ...baseEvent, isPast: false });
  const { default: EventPage } = await import("@/app/(public)/events/[id]/page");
  const page = textOf(await EventPage({ params: Promise.resolve({ id: baseEvent.id }) }));

  expect(page).not.toContain("SDE Video");
  expect(page).toContain("https://forms.example/hack");
});

test("a past event shows its SDE videos above its photos and drops registration", async () => {
  events.getPublicEvent.mockResolvedValue({
    ...baseEvent,
    isPast: true,
    sdeVideos: [{ id: "v1", title: "Highlights", caption: null, link: null, file: { url: "https://files.example/v.mp4", mediaType: "video/mp4" } }],
    photos: [{ id: "p1", url: "https://files.example/p.webp", altText: "Teams presenting", isCover: true }],
  });
  const { default: EventPage } = await import("@/app/(public)/events/[id]/page");
  const page = textOf(await EventPage({ params: Promise.resolve({ id: baseEvent.id }) }));

  expect(page.indexOf("SDE Video")).toBeGreaterThan(-1);
  expect(page.indexOf("SDE Video")).toBeLessThan(page.indexOf("Photos"));
  expect(page).not.toContain("https://forms.example/hack");
});

test("a draft or unknown event is not found", async () => {
  events.getPublicEvent.mockResolvedValue(null);
  const { default: EventPage } = await import("@/app/(public)/events/[id]/page");

  await expect(EventPage({ params: Promise.resolve({ id: "draft" }) })).rejects.toThrow("NEXT_NOT_FOUND");
});
