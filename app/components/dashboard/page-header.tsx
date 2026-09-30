"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  action,
  className,
  titleClassName,
  descriptionClassName,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col mt-6 sm:mt-8 sm:flex-row sm:items-center justify-between gap-4",
        className
      )}
    >
      <div>
        <h1
          className={cn(
            "text-3xl font-normal font-display text-ink tracking-tight",
            titleClassName
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "text-sm text-muted font-sans mt-1",
              descriptionClassName
            )}
          >
            {description}
          </p>
        )}
      </div>

      {(action || children) && (
        <div className="flex items-center gap-3">
          {action}
          {children}
        </div>
      )}
    </div>
  );
}

export interface PageHeaderButtonProps
  extends React.ComponentProps<typeof Button> {
  icon?: React.ReactNode;
}

export function PageHeaderButton({
  children,
  icon,
  className,
  variant,
  ...props
}: PageHeaderButtonProps) {
  const isOutline = variant === "outline";

  return (
    <Button
      variant={variant}
      className={cn(
        "h-12 inline-flex items-center gap-2.5 rounded-full px-6 text-sm font-bold font-sans transition-all cursor-pointer shadow-xs",
        isOutline
          ? "bg-card hover:bg-green-soft text-green hover:text-green-hover border border-green hover:border-green-hover shadow-2xs"
          : "bg-linear-to-r from-[#198d5d] to-[#2da482] hover:brightness-105 text-white border-0",
        className
      )}
      {...props}
    >
      {icon}
      {children && <span>{children}</span>}
    </Button>
  );
}
