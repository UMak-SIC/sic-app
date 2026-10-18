import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "@/components/ui/skeleton";
import { EventsTableSkeleton } from "@/components/events/events-table-skeleton";
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton";
import { EventPeopleTableSkeleton } from "@/components/events/event-people-table-skeleton";
import EventsLoading from "@/app/ems/(tabs)/events/loading";
import EventDetailLoading from "@/app/ems/(tabs)/events/[id]/loading";

describe("Events Skeleton Components", () => {
  it("renders the base Skeleton primitive with data-slot and custom className", () => {
    const el = Skeleton({ className: "h-4 w-20 custom-class" });
    expect(isValidElement(el)).toBe(true);
    expect(el.props["data-slot"]).toBe("skeleton");
    expect(el.props.className).toContain("animate-pulse");
    expect(el.props.className).toContain("bg-line/60");
    expect(el.props.className).toContain("custom-class");
  });

  it("renders EventsTableSkeleton with accessible attributes", () => {
    const el = EventsTableSkeleton({ rowCount: 6 });
    expect(isValidElement(el)).toBe(true);
    expect(el.props["aria-busy"]).toBe("true");
    expect(el.props["aria-label"]).toBe("Loading events catalog");
  });

  it("renders EventDetailSkeleton with accessible attributes", () => {
    const el = EventDetailSkeleton();
    expect(isValidElement(el)).toBe(true);
    expect(el.props["aria-busy"]).toBe("true");
    expect(el.props["aria-label"]).toBe("Loading event details");
  });

  it("renders EventPeopleTableSkeleton with specified rowCount", () => {
    const el = EventPeopleTableSkeleton({ rowCount: 5 });
    expect(isValidElement(el)).toBe(true);
    expect(el.props["aria-busy"]).toBe("true");
    expect(el.props["aria-label"]).toBe("Loading invited people");
  });

  it("renders EventPeopleTableSkeleton with centered ticket and attendance columns", () => {
    const el = EventPeopleTableSkeleton({ rowCount: 3 });
    expect(isValidElement(el)).toBe(true);

    const table = (el.props as { children: React.ReactElement }).children;
    const [header, body] = (table.props as { children: [React.ReactElement, React.ReactElement] }).children;
    const headerRow = (header.props as { children: React.ReactElement }).children;
    const heads = (headerRow.props as { children: React.ReactElement[] }).children;

    // Ticket column header (index 2) and Attendance column header (index 3)
    expect(heads[2].props.children).toBe("Ticket");
    expect(heads[2].props.className).toContain("text-center");
    expect(heads[3].props.children).toBe("Attendance");
    expect(heads[3].props.className).toContain("text-center");

    // Cells in rows
    const rows = (body.props as { children: React.ReactElement[] }).children;
    expect(rows).toHaveLength(3);
    const firstRowCells = (rows[0].props as { children: React.ReactElement[] }).children;
    expect(firstRowCells[2].props.className).toContain("text-center");
    expect(firstRowCells[3].props.className).toContain("text-center");
  });

  it("renders route-level streaming loading boundary for /events", () => {
    const el = EventsLoading();
    expect(isValidElement(el)).toBe(true);
  });

  it("renders route-level streaming loading boundary for /events/[id]", () => {
    const el = EventDetailLoading();
    expect(isValidElement(el)).toBe(true);
  });
});
