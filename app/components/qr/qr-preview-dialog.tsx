"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, SpinnerGap } from "@phosphor-icons/react";

import {
  downloadQrPng,
  generateQrPng,
  type QrLink,
  shortUrlForCode,
} from "@/components/qr/qr-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type QrPreviewDialogProps = {
  link: QrLink | null;
  open: boolean;
  downloadWhenReady: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QrPreviewDialog({
  link,
  open,
  downloadWhenReady,
  onOpenChange,
}: QrPreviewDialogProps) {
  const [image, setImage] = useState<string | null>(null);
  const [scanUrl] = useState(() =>
    link && typeof window !== "undefined" ? shortUrlForCode(window.location.origin, link.code) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [logoWarning, setLogoWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !link) return;
    let cancelled = false;
    const origin = window.location.origin;

    void generateQrPng(link, origin, () => {
      if (!cancelled) setLogoWarning("The center logo could not load. This QR code was created without it.");
    })
      .then((dataUrl) => {
        if (cancelled) return;
        setImage(dataUrl);
        if (downloadWhenReady) downloadQrPng(dataUrl, link.code);
      })
      .catch((renderError) => {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : "The QR preview could not be prepared.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [downloadWhenReady, link, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[16px] border-line bg-card text-center sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="font-display text-xl font-bold text-ink">{link?.name ?? "QR preview"}</DialogTitle>
          <DialogDescription>Scan this code to open the destination link.</DialogDescription>
        </DialogHeader>

        <div className="mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center rounded-[12px] border border-line bg-paper p-4">
          {error ? (
            <p role="alert" className="text-sm text-red">{error}</p>
          ) : image ? (
            // The preview is generated locally as a data URL and has no remote image host.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={`QR code for ${link?.name ?? "link"}`} className="h-full w-full" />
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              <SpinnerGap className="animate-spin motion-reduce:animate-none" size={20} /> Preparing QR…
            </span>
          )}
        </div>

        <p className="break-all text-xs text-muted">{scanUrl}</p>
        {logoWarning && <p role="status" className="text-xs text-amber">{logoWarning}</p>}
        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            className="rounded-[6px] bg-cyan text-white hover:bg-cyan-hover"
            disabled={!image}
            onClick={() => image && link && downloadQrPng(image, link.code)}
          >
            <DownloadSimple size={18} weight="bold" aria-hidden="true" /> Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
