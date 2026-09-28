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
        "flex flex-col mt-3 sm:flex-row sm:items-center justify-between gap-4",
        className
      )}
    >
      <div>
        <h1
          className={cn(
            "text-3xl font-normal font-display text-slate-900 tracking-tight",
            titleClassName
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "text-sm text-slate-500 font-sans mt-1",
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
  ...props
}: PageHeaderButtonProps) {
  return (
    <Button
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#198d5d] to-[#2da482] hover:brightness-105 px-6 py-5 text-sm font-bold text-white shadow-xs transition-all cursor-pointer border-0",
        className
      )}
      {...props}
    >
      {icon}
      {children && <span>{children}</span>}
    </Button>
  );
}
