import * as React from "react";
import { expect, test, vi } from "vitest";

import { DuplicateEventDialog } from "@/components/events/duplicate-event-dialog";
import type { EventItem } from "@/components/events/events-table";

const mockEvent: EventItem = {
  id: "evt-1",
  title: "Hackathon 2026 Orientation",
  venue: "Auditorium A",
  date: "Oct 25, 2026",
  time: "9:00 AM - 12:00 PM",
  status: "draft",
  registeredCount: 15,
};

test("renders DuplicateEventDialog element tree with event details", () => {
  const el = DuplicateEventDialog({
    open: true,
    onOpenChange: vi.fn(),
    event: mockEvent,
    isDuplicating: false,
    onConfirm: vi.fn(),
  });

  expect(React.isValidElement(el)).toBe(true);
  const serialized = JSON.stringify(el?.props.children);
  expect(serialized).toContain("Duplicate event");
  expect(serialized).toContain("Hackathon 2026 Orientation");
  expect(serialized).toContain("Auditorium A");
  expect(serialized).toContain("Create draft copy");
});

test("shows loading label when duplicating is in progress", () => {
  const el = DuplicateEventDialog({
    open: true,
    onOpenChange: vi.fn(),
    event: mockEvent,
    isDuplicating: true,
    onConfirm: vi.fn(),
  });

  const serialized = JSON.stringify(el?.props.children);
  expect(serialized).toContain("Duplicating...");
});

test("renders null when event is null", () => {
  const el = DuplicateEventDialog({
    open: true,
    onOpenChange: vi.fn(),
    event: null,
    isDuplicating: false,
    onConfirm: vi.fn(),
  });

  expect(el).toBeNull();
});
