import * as React from "react";
import { expect, test, vi } from "vitest";

import { PublishEventDialog } from "@/components/events/publish-event-dialog";

const mockEvent = {
  id: "evt-123",
  name: "Annual Technology Summit 2026",
  startsAt: "2026-10-25T09:00:00.000Z",
  endsAt: "2026-10-25T17:00:00.000Z",
  venue: "Grand Theater, UMak Campus",
  rosterCount: 150,
};

test("renders PublishEventDialog element tree with event details", () => {
  const el = PublishEventDialog({
    open: true,
    onOpenChange: vi.fn(),
    event: mockEvent,
    timezone: "UTC",
    isPublishing: false,
    onConfirm: vi.fn(),
  });

  expect(React.isValidElement(el)).toBe(true);
  expect(el?.props.open).toBe(true);

  const content = el?.props.children;
  expect(React.isValidElement(content)).toBe(true);

  const serialized = JSON.stringify(content);
  expect(serialized).toContain("Publish this event?");
  expect(serialized).toContain("Annual Technology Summit 2026");
  expect(serialized).toContain("Grand Theater, UMak Campus");
  expect(serialized).toContain("150 students registered");
  expect(serialized).toContain("Publish event");
});

test("shows loading label when publication is in progress", () => {
  const el = PublishEventDialog({
    open: true,
    onOpenChange: vi.fn(),
    event: mockEvent,
    timezone: "UTC",
    isPublishing: true,
    onConfirm: vi.fn(),
  });

  const serialized = JSON.stringify(el?.props.children);
  expect(serialized).toContain("Publishing...");
});

test("renders null when event is null", () => {
  const el = PublishEventDialog({
    open: true,
    onOpenChange: vi.fn(),
    event: null,
    isPublishing: false,
    onConfirm: vi.fn(),
  });

  expect(el).toBeNull();
});
