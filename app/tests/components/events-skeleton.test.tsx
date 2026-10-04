import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "@/components/ui/skeleton";
import { EventsTableSkeleton } from "@/components/events/events-table-skeleton";
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton";
import { EventPeopleTableSkeleton } from "@/components/events/event-people-table-skeleton";
import EventsLoading from "@/app/(tabs)/events/loading";
import EventDetailLoading from "@/app/(tabs)/events/[id]/loading";

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

  it("renders route-level streaming loading boundary for /events", () => {
    const el = EventsLoading();
    expect(isValidElement(el)).toBe(true);
  });

  it("renders route-level streaming loading boundary for /events/[id]", () => {
    const el = EventDetailLoading();
    expect(isValidElement(el)).toBe(true);
  });
});
