import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-[6px] bg-line/60 dark:bg-line/40", className)}
      {...props}
    />
  );
}

export { Skeleton };
