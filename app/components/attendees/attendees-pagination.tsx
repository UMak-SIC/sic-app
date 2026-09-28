"use client";

import * as React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AttendeesPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function AttendeesPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: AttendeesPaginationProps) {
  if (totalItems === 0 || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate visible page numbers
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 font-sans",
        className
      )}
    >
      {/* Range text */}
      <span className="text-xs text-muted">
        Showing <span className="font-semibold text-ink">{startItem}</span> to{" "}
        <span className="font-semibold text-ink">{endItem}</span> of{" "}
        <span className="font-semibold text-ink">{totalItems}</span> attendees
      </span>

      {/* Page buttons */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 px-2.5 text-xs font-semibold border-line cursor-pointer disabled:opacity-40"
        >
          <CaretLeft size={14} weight="bold" className="mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "h-8 min-w-[32px] px-2 rounded-[6px] text-xs font-semibold transition-all cursor-pointer",
                currentPage === p
                  ? "bg-cyan text-white shadow-2xs"
                  : "bg-white border border-line text-ink hover:bg-canvas"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 px-2.5 text-xs font-semibold border-line cursor-pointer disabled:opacity-40"
        >
          Next
          <CaretRight size={14} weight="bold" className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
