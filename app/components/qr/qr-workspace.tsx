"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, QrCode, WarningCircle } from "@phosphor-icons/react";

import {
  deleteQrLink,
  listQrLinks,
  type QrLink,
  setQrLinkStatus,
} from "@/components/qr/qr-client";
import { QrLinkFormDialog } from "@/components/qr/qr-link-form-dialog";
import { QrLinkRow } from "@/components/qr/qr-link-row";
import { QrPreviewDialog } from "@/components/qr/qr-preview-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function QrWorkspace() {
  const [links, setLinks] = useState<QrLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QrLink | null>(null);
  const [previewing, setPreviewing] = useState<QrLink | null>(null);
  const [downloadWhenReady, setDownloadWhenReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLinks(await listQrLinks());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Your QR links could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const mutate = async (link: QrLink, operation: () => Promise<unknown>) => {
    setBusyId(link.id);
    setError(null);
    try {
      await operation();
      await refresh();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "The link could not be updated.");
    } finally {
      setBusyId(null);
    }
  };

  const openPreview = (link: QrLink, download = false) => {
    setDownloadWhenReady(download);
    setPreviewing(link);
  };

  return (
    <main className="min-h-[100dvh] bg-canvas px-4 py-6 font-sans text-ink sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="rounded-[16px] border border-line bg-paper p-5 sm:p-7">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan">
            <ArrowLeft size={18} aria-hidden="true" /> Back to all tools
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-cyan-soft text-cyan">
                  <QrCode size={24} aria-hidden="true" />
                </span>
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">QR Generator</h1>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted">
                Create short links for posters and handouts, then track how often each QR code is scanned.
              </p>
            </div>
            <Button
              type="button"
              className="h-11 rounded-[6px] bg-cyan px-5 font-semibold text-white hover:bg-cyan-hover"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={20} weight="bold" aria-hidden="true" /> Create link
            </Button>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-[12px] border border-red bg-red-soft p-4 text-sm text-red">
            <WarningCircle size={20} aria-hidden="true" />
            <div className="flex-1">{error}</div>
            <Button type="button" variant="outline" className="h-8 rounded-[6px] border-red" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        )}

        {loading ? (
          <section aria-busy="true" aria-label="Loading QR links" className="space-y-3">
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-40 rounded-[12px]" />)}
          </section>
        ) : links.length === 0 ? (
          <section className="rounded-[16px] border border-dashed border-line bg-paper px-6 py-14 text-center">
            <QrCode size={24} className="mx-auto mb-3 text-cyan" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold text-ink">No QR links yet</h2>
            <p className="mt-2 text-sm text-muted">Create your first link to get a downloadable QR code.</p>
          </section>
        ) : (
          <section aria-label="QR links" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-ink">Your links</h2>
              <span className="text-sm text-muted">{links.length} {links.length === 1 ? "link" : "links"}</span>
            </div>
            {links.map((link) => (
              <QrLinkRow
                key={link.id}
                link={link}
                busy={busyId === link.id}
                onEdit={(selected) => {
                  setEditing(selected);
                  setFormOpen(true);
                }}
                onPreview={openPreview}
                onToggleStatus={(selected) => void mutate(
                  selected,
                  () => setQrLinkStatus(selected.id, selected.status === "ACTIVE" ? "DISABLED" : "ACTIVE"),
                )}
                onDelete={(selected) => {
                  if (window.confirm(`Delete “${selected.name}”? This cannot be undone.`)) {
                    void mutate(selected, () => deleteQrLink(selected.id));
                  }
                }}
              />
            ))}
          </section>
        )}
      </div>

      {formOpen && (
        <QrLinkFormDialog
          open
          link={editing}
          onOpenChange={setFormOpen}
          onSaved={refresh}
        />
      )}
      {previewing && (
        <QrPreviewDialog
          open
          link={previewing}
          downloadWhenReady={downloadWhenReady}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setPreviewing(null);
              setDownloadWhenReady(false);
            }
          }}
        />
      )}
    </main>
  );
}
