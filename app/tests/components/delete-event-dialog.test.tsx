import * as React from "react";
import { expect, test, vi } from "vitest";

import { DeleteEventDialog } from "@/components/events/delete-event-dialog";
import type { EventItem } from "@/components/events/events-table";

const mockDraftEvent: EventItem = {
  id: "evt-draft-1",
  title: "Hackathon 2026 Orientation",
  venue: "Auditorium A",
  date: "Oct 25, 2026",
  time: "9:00 AM - 12:00 PM",
  status: "draft",
  registeredCount: 15,
};

const mockPublishedEvent: EventItem = {
  id: "evt-pub-1",
  title: "Commencement Exercises",
  venue: "Grand Arena",
  date: "Nov 10, 2026",
  time: "1:00 PM - 5:00 PM",
  status: "published",
  registeredCount: 300,
};

test("renders DeleteEventDialog for draft events with warning of unlinked students", () => {
  const el = DeleteEventDialog({
    open: true,
    onOpenChange: vi.fn(),
    event: mockDraftEvent,
    isDeleting: false,
    onConfirm: vi.fn(),
  });

  expect(React.isValidElement(el)).toBe(true);
  const serialized = JSON.stringify(el?.props.children);
  expect(serialized).toContain("Delete draft event?");
  expect(serialized).toContain("Hackathon 2026 Orientation");
  expect(serialized).toContain("Registered students will be unlinked");
  expect(serialized).toContain("students are");
  expect(serialized).toContain("Delete event");
});

test("shows non-deletable notice for published events", () => {
  const el = DeleteEventDialog({
    open: true,
    onOpenChange: vi.fn(),
    event: mockPublishedEvent,
    isDeleting: false,
    onConfirm: vi.fn(),
  });

  const serialized = JSON.stringify(el?.props.children);
  expect(serialized).toContain("Event cannot be deleted");
  expect(serialized).toContain("Commencement Exercises");
  expect(serialized).toContain("Only draft events without public attendance records can be deleted.");
  expect(serialized).toContain("Close");
});

test("renders null when event is null", () => {
  const el = DeleteEventDialog({
    open: true,
    onOpenChange: vi.fn(),
    event: null,
    isDeleting: false,
    onConfirm: vi.fn(),
  });

  expect(el).toBeNull();
});
