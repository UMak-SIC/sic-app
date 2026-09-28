"use client";

import * as React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function EventsPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: EventsPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Item count summary */}
      <span className="text-sm font-sans text-muted">
        Viewing <span className="font-semibold text-ink">{startItem}-{endItem}</span> of{" "}
        <span className="font-semibold text-ink">{totalItems}</span> events
      </span>

      {/* Pagination step controls */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8.5 gap-1.5 rounded-[7px] border-line px-3 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-40 cursor-pointer"
        >
          <CaretLeft size={15} weight="bold" />
          <span>Previous</span>
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "flex size-8.5 items-center justify-center rounded-[7px] text-xs font-sans transition-colors cursor-pointer",
                  isActive
                    ? "bg-cyan text-white font-bold shadow-xs"
                    : "text-muted hover:bg-canvas hover:text-ink font-medium"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8.5 gap-1.5 rounded-[7px] border-line px-3 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-40 cursor-pointer"
        >
          <span>Next</span>
          <CaretRight size={15} weight="bold" />
        </Button>
      </div>
    </div>
  );
}
