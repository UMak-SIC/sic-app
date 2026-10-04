import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-2xl border-[1.5px] border-line bg-card px-4 py-3 text-sm text-ink shadow-xs transition-colors placeholder:text-muted-light focus-visible:outline-none focus-visible:border-green focus-visible:ring-4 focus-visible:ring-green/10 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-sans",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
