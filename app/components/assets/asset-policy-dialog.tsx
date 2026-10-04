"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  FileText,
  LockKey,
  Clock,
  Lightning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface AssetPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedCount?: number;
}

export function AssetPolicyDialog({
  open,
  onOpenChange,
  lockedCount = 6,
}: AssetPolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-line rounded-[14px] p-0 overflow-hidden shadow-2xl font-sans">
        {/* Header */}
        <div className="p-4.5 pr-12 border-b border-line bg-paper flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-[8px] bg-cyan-soft text-cyan flex items-center justify-center shrink-0">
              <ShieldCheck size={20} weight="bold" />
            </div>
            <div>
              <DialogTitle className="text-base font-display font-bold text-ink">
                Asset Policy
              </DialogTitle>
              <DialogDescription className="text-xs text-muted mt-0.5 font-sans">
                Quick rules for uploading and managing university files.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* 4 Super Simplified Cards */}
        <div className="p-5 max-h-[70vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-canvas/30">
          {/* 1. Allowed Files */}
          <div className="p-3.5 rounded-[10px] bg-card border border-line flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-ink font-display font-bold text-xs">
                <FileText size={16} weight="bold" className="text-cyan" />
                <span>1. File Types</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-soft text-cyan">
                Max 10 MB
              </span>
            </div>
            <ul className="text-xs space-y-1.5 text-ink/90 font-sans">
              <li>• <strong>Images:</strong> JPG, PNG, WebP</li>
              <li>• <strong>Documents:</strong> PDF only</li>
              <li>• <strong>Max size:</strong> 10 MB per file</li>
            </ul>
          </div>

          {/* 2. Delete Lock */}
          <div className="p-3.5 rounded-[10px] bg-card border border-line flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-ink font-display font-bold text-xs">
                <LockKey size={16} weight="bold" className="text-amber" />
                <span>2. Delete Lock</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-soft text-amber">
                {lockedCount} Locked
              </span>
            </div>
            <ul className="text-xs space-y-1.5 text-ink/90 font-sans">
              <li>• In-use files <strong>cannot be deleted</strong>.</li>
              <li>• Remove from event first to unlock.</li>
              <li>• Prevents broken student links.</li>
            </ul>
          </div>

          {/* 3. 5-Year Storage */}
          <div className="p-3.5 rounded-[10px] bg-card border border-line flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-ink font-display font-bold text-xs">
                <Clock size={16} weight="bold" className="text-green" />
                <span>3. 5-Year Storage</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-soft text-green">
                5 Years
              </span>
            </div>
            <ul className="text-xs space-y-1.5 text-ink/90 font-sans">
              <li>• Kept for <strong>5 years</strong> post-event.</li>
              <li>• Cleaned automatically each quarter.</li>
              <li>• Student privacy fully protected.</li>
            </ul>
          </div>

          {/* 4. Safe & Fast */}
          <div className="p-3.5 rounded-[10px] bg-card border border-line flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-ink font-display font-bold text-xs">
                <Lightning size={16} weight="bold" className="text-cyan" />
                <span>4. Safe & Fast</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-soft text-green">
                Active
              </span>
            </div>
            <ul className="text-xs space-y-1.5 text-ink/90 font-sans">
              <li>• Files checked for safety on upload.</li>
              <li>• Loads fast on phones & webmail.</li>
              <li>• Only admins can upload or delete.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-line bg-paper flex items-center justify-end">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-8 px-4 cursor-pointer shadow-xs"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
