import * as React from "react";
import { expect, test, vi } from "vitest";

import { QuickCheckinDialog } from "@/components/events/quick-checkin-dialog";

const mockPerson = {
  id: "person-1",
  name: "Andrea Santos",
  studentId: "2023-00182",
  email: "andrea.santos@umak.edu.ph",
  attendanceStatus: "PENDING" as const,
  attendedAt: null,
};

test("renders QuickCheckinDialog with attendee details and actions", () => {
  const el = QuickCheckinDialog({
    open: true,
    onOpenChange: vi.fn(),
    person: mockPerson,
    isSaving: false,
    onConfirm: vi.fn(),
  });

  expect(React.isValidElement(el)).toBe(true);
  expect(el?.props.open).toBe(true);

  const content = el?.props.children;
  expect(React.isValidElement(content)).toBe(true);

  const serialized = JSON.stringify(content);
  expect(serialized).toContain("Check in attendee");
  expect(serialized).toContain("Andrea Santos");
  expect(serialized).toContain("2023-00182");
  expect(serialized).toContain("Mark as late");
  expect(serialized).toContain("Mark present");
});

test("shows loading label when check-in is in progress", () => {
  const el = QuickCheckinDialog({
    open: true,
    onOpenChange: vi.fn(),
    person: mockPerson,
    isSaving: true,
    onConfirm: vi.fn(),
  });

  const serialized = JSON.stringify(el?.props.children);
  expect(serialized).toContain("Checking in...");
});

test("renders null when person is null", () => {
  const el = QuickCheckinDialog({
    open: true,
    onOpenChange: vi.fn(),
    person: null,
    isSaving: false,
    onConfirm: vi.fn(),
  });

  expect(el).toBeNull();
});
