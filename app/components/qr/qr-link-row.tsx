"use client";

import {
  DownloadSimple,
  Eye,
  LinkSimple,
  NotePencil,
  Pause,
  Play,
  Trash,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import type { QrLink } from "@/components/qr/qr-client";

type QrLinkRowProps = {
  link: QrLink;
  busy: boolean;
  now?: Date;
  onEdit: (link: QrLink) => void;
  onPreview: (link: QrLink, download?: boolean) => void;
  onToggleStatus: (link: QrLink) => void;
  onDelete: (link: QrLink) => void;
};

export function QrLinkRow({
  link,
  busy,
  now = new Date(),
  onDelete,
  onEdit,
  onPreview,
  onToggleStatus,
}: QrLinkRowProps) {
  const disabled = link.status === "DISABLED";
  const expired = !disabled && Boolean(link.expiresAt && new Date(link.expiresAt) <= now);
  const active = !disabled && !expired;
  const status = disabled ? "Paused" : expired ? "Expired" : "Active";

  return (
    <article className="grid gap-4 rounded-[12px] border border-line bg-card p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-5">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate font-display text-xl font-bold text-ink">{link.name}</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              active
                ? "bg-green-soft text-green"
                : expired
                  ? "bg-amber-soft text-amber"
                  : "bg-canvas text-muted"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <LinkSimple size={16} aria-hidden="true" />
          <span className="truncate">{link.destination}</span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <span className="font-semibold text-ink">{link.viewCount} {link.viewCount === 1 ? "scan" : "scans"}</span>
          <span>Code: {link.code}</span>
          <span>
            {link.expiresAt
              ? `Expires ${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(link.expiresAt))}`
              : "No expiry"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:max-w-[430px] lg:justify-end">
        <Button
          type="button"
          variant="outline"
          className="rounded-[6px]"
          disabled={busy}
          onClick={() => onPreview(link)}
        >
          <Eye size={16} aria-hidden="true" /> Preview QR
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-[6px]"
          disabled={busy}
          onClick={() => onPreview(link, true)}
        >
          <DownloadSimple size={16} aria-hidden="true" /> Download PNG
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-[6px]"
          disabled={busy}
          onClick={() => onEdit(link)}
        >
          <NotePencil size={16} aria-hidden="true" /> Edit
        </Button>
        {!expired && (
          <Button
            type="button"
            variant="outline"
            className="rounded-[6px]"
            disabled={busy}
            onClick={() => onToggleStatus(link)}
          >
            {link.status === "ACTIVE" ? (
              <Pause size={16} aria-hidden="true" />
            ) : (
              <Play size={16} aria-hidden="true" />
            )}
            {link.status === "ACTIVE" ? "Pause link" : "Resume link"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="rounded-[6px] border-red text-red hover:bg-red-soft"
          disabled={busy}
          onClick={() => onDelete(link)}
        >
          <Trash size={16} aria-hidden="true" /> Delete
        </Button>
      </div>
    </article>
  );
}
