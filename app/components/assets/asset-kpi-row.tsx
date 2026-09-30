"use client";

import * as React from "react";
import { animate, useReducedMotion } from "motion/react";
import {
  HardDrives,
  FolderOpen,
  LockKey,
  CloudCheck,
} from "@phosphor-icons/react";
import { StorageKpis } from "./asset-types";

const EASE = [0.16, 1, 0.3, 1] as const;

interface AssetKpiRowProps {
  kpis: StorageKpis;
}

export function AssetKpiRow({ kpis }: AssetKpiRowProps) {
  const reduced = useReducedMotion();

  const [displayFiles, setDisplayFiles] = React.useState(0);
  const [displayLocked, setDisplayLocked] = React.useState(0);

  React.useEffect(() => {
    if (reduced) return;

    const c1 = animate(0, kpis.totalFilesCount, {
      duration: 0.8,
      ease: EASE,
      onUpdate: (latest) => setDisplayFiles(Math.round(latest)),
    });

    const c2 = animate(0, kpis.referencedCount, {
      duration: 0.9,
      delay: 0.1,
      ease: EASE,
      onUpdate: (latest) => setDisplayLocked(Math.round(latest)),
    });

    return () => {
      c1.stop();
      c2.stop();
    };
  }, [kpis.totalFilesCount, kpis.referencedCount, reduced]);

  const filesCount = reduced ? kpis.totalFilesCount : displayFiles;
  const lockedCount = reduced ? kpis.referencedCount : displayLocked;

  const storageUsagePercent = Math.max(
    1,
    Math.round((kpis.totalBytesUsed / kpis.storageQuotaBytes) * 100)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full font-sans">
      {/* 1. Storage Quota Footprint */}
      <div className="p-4 rounded-[12px] bg-card border border-line shadow-xs flex flex-col justify-between transition-all hover:border-cyan/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-[6px] bg-cyan-soft text-cyan flex items-center justify-center">
              <HardDrives size={16} weight="bold" />
            </span>
            <span className="text-xs font-semibold text-ink font-sans">
              Storage Footprint
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-soft text-cyan font-sans">
            Media Storage
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-ink tracking-tight">
              {kpis.totalBytesFormatted}
            </span>
            <span className="text-xs text-muted font-sans font-medium">
              / {kpis.storageQuotaFormatted}
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="mt-2.5 h-1.5 w-full bg-line-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, storageUsagePercent)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted font-sans mt-1 block">
            {storageUsagePercent}% of quota allocated
          </span>
        </div>
      </div>

      {/* 2. Total Uploaded Assets */}
      <div className="p-4 rounded-[12px] bg-card border border-line shadow-xs flex flex-col justify-between transition-all hover:border-cyan/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-[6px] bg-cyan-soft text-cyan flex items-center justify-center">
              <FolderOpen size={16} weight="bold" />
            </span>
            <span className="text-xs font-semibold text-ink font-sans">
              Active Files
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-canvas text-muted border border-line font-sans">
            Library
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-ink tracking-tight tabular-nums">
              {filesCount}
            </span>
            <span className="text-xs text-muted font-sans font-medium">
              total assets
            </span>
          </div>
          <p className="text-[11px] text-muted font-sans mt-1">
            {kpis.imageCount} images · {kpis.documentCount} documents
          </p>
        </div>
      </div>

      {/* 3. Delete-Protected Assets */}
      <div className="p-4 rounded-[12px] bg-card border border-line shadow-xs flex flex-col justify-between transition-all hover:border-cyan/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-[6px] bg-amber-soft text-amber flex items-center justify-center">
              <LockKey size={16} weight="bold" />
            </span>
            <span className="text-xs font-semibold text-ink font-sans">
              Delete-Protected
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-soft text-amber font-sans">
            Referenced
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-ink tracking-tight tabular-nums">
              {lockedCount}
            </span>
            <span className="text-xs text-muted font-sans font-medium">
              locked files
            </span>
          </div>
          <p className="text-[11px] text-muted font-sans mt-1">
            Active in events & announcements
          </p>
        </div>
      </div>

      {/* 4. Storage Health & Sync */}
      <div className="p-4 rounded-[12px] bg-card border border-line shadow-xs flex flex-col justify-between transition-all hover:border-green/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-[6px] bg-green-soft text-green flex items-center justify-center">
              <CloudCheck size={16} weight="bold" />
            </span>
            <span className="text-xs font-semibold text-ink font-sans">
              Storage Health
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-soft text-green font-sans">
            Connected
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green inline-block animate-pulse" />
            <span className="text-sm font-display font-bold text-ink">
              All Assets Synced
            </span>
          </div>
          <p className="text-[11px] text-muted font-sans mt-1">
            Fast cloud delivery active
          </p>
        </div>
      </div>
    </div>
  );
}
