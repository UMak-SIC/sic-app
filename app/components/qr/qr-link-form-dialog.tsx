"use client";

import { useEffect, useState } from "react";
import { ImageSquare, SpinnerGap, UploadSimple } from "@phosphor-icons/react";

import {
  createQrLink,
  generateQrPng,
  type QrLink,
  type QrLinkInput,
  updateQrLink,
  uploadQrLogo,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QrLinkFormDialogProps = {
  open: boolean;
  link: QrLink | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function validateDestination(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !/\s/.test(value.trim())
      ? null
      : "Enter a secure HTTPS destination link.";
  } catch {
    return "Enter a secure HTTPS destination link.";
  }
}

export function QrLinkFormDialog({
  open,
  link,
  onOpenChange,
  onSaved,
}: QrLinkFormDialogProps) {
  const [draft, setDraft] = useState(() => ({
    name: link?.name === "Untitled link" ? "" : link?.name ?? "",
    destination: link?.destination ?? "",
    expiresAt: toLocalDateTime(link?.expiresAt ?? null),
    qrForeground: link?.qrForeground ?? "#12333A",
    qrBackground: link?.qrBackground ?? "#FFFFFF",
    qrLogoAssetId: link?.qrLogoAssetId ?? null,
  }));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [expiryError, setExpiryError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(link?.qrLogoUrl ?? null);

  useEffect(() => {
    if (!open || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, open]);

  useEffect(() => {
    let cancelled = false;
    const destinationMessage = validateDestination(draft.destination);
    if (destinationMessage) {
      queueMicrotask(() => {
        if (!cancelled) setPreview(null);
      });
      return () => {
        cancelled = true;
      };
    }

    const previewLink: QrLink = {
      id: "preview",
      code: link?.code ?? "Preview",
      name: draft.name || "Untitled link",
      destination: draft.destination,
      viewCount: 0,
      status: "ACTIVE",
      expiresAt: null,
      qrForeground: draft.qrForeground,
      qrBackground: draft.qrBackground,
      qrLogoAssetId: draft.qrLogoAssetId,
      qrLogoUrl: logoPreviewUrl,
      createdAt: "",
      updatedAt: "",
    };

    void generateQrPng(previewLink, window.location.origin, () => {
      if (!cancelled) setError("The center logo could not load. The QR preview uses no logo.");
    }).then((dataUrl) => {
      if (!cancelled) setPreview(dataUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [draft.destination, draft.name, draft.qrBackground, draft.qrForeground, draft.qrLogoAssetId, link?.code, logoPreviewUrl]);

  useEffect(() => () => {
    if (logoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
  }, [logoPreviewUrl]);

  const updateDraft = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const close = () => {
    if (dirty && !saving && !window.confirm("Discard your unsaved link changes?")) return;
    onOpenChange(false);
  };

  const checkExpiry = () => {
    const invalid = Boolean(draft.expiresAt && new Date(draft.expiresAt) <= new Date());
    setExpiryError(invalid ? "Choose a future expiry date and time." : null);
    return !invalid;
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setLogoPreviewUrl(localPreview);
    setUploading(true);
    setError(null);
    try {
      updateDraft("qrLogoAssetId", await uploadQrLogo(file));
    } catch (uploadError) {
      setLogoPreviewUrl(link?.qrLogoUrl ?? null);
      setError(uploadError instanceof Error ? uploadError.message : "The logo could not be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const destinationMessage = validateDestination(draft.destination);
    setDestinationError(destinationMessage);
    if (destinationMessage || !checkExpiry()) return;

    setSaving(true);
    setError(null);
    const input: QrLinkInput = {
      name: draft.name,
      destination: draft.destination,
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
      qrForeground: draft.qrForeground,
      qrBackground: draft.qrBackground,
      qrLogoAssetId: draft.qrLogoAssetId,
    };

    try {
      if (link) await updateQrLink(link.id, input);
      else await createQrLink(input);
      setDirty(false);
      await onSaved();
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The link could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}>
      <DialogContent className="rounded-[16px] border-line bg-card sm:max-w-xl">
        <form onSubmit={submit} className="space-y-5" noValidate>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-ink">
              {link ? "Edit QR link" : "Create QR link"}
            </DialogTitle>
            <DialogDescription>
              The QR code keeps the same short link while you update its destination or appearance.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="rounded-[9px] bg-red-soft px-3 py-2 text-sm text-red">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="qr-name">Link name</Label>
            <Input
              id="qr-name"
              value={draft.name}
              placeholder="Student handbook"
              className="h-11 rounded-[6px]"
              onChange={(event) => updateDraft("name", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-destination">Destination link</Label>
            <Input
              id="qr-destination"
              type="url"
              required
              value={draft.destination}
              placeholder="https://example.com/page"
              aria-invalid={Boolean(destinationError)}
              aria-describedby={destinationError ? "qr-destination-error" : undefined}
              className="h-11 rounded-[6px]"
              onChange={(event) => updateDraft("destination", event.target.value)}
              onBlur={() => setDestinationError(validateDestination(draft.destination))}
            />
            {destinationError && <p id="qr-destination-error" className="text-xs text-red">{destinationError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-expiry">Expiry date and time (optional)</Label>
            <Input
              id="qr-expiry"
              type="datetime-local"
              value={draft.expiresAt}
              aria-invalid={Boolean(expiryError)}
              aria-describedby={expiryError ? "qr-expiry-error" : undefined}
              className="h-11 rounded-[6px]"
              onChange={(event) => updateDraft("expiresAt", event.target.value)}
              onBlur={checkExpiry}
            />
            {expiryError && <p id="qr-expiry-error" className="text-xs text-red">{expiryError}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qr-foreground">QR foreground</Label>
              <div className="flex items-center gap-2 rounded-[6px] border border-line bg-paper p-2">
                <input
                  id="qr-foreground"
                  type="color"
                  value={draft.qrForeground}
                  className="h-8 w-10 cursor-pointer rounded-[4px] border-0 bg-transparent"
                  onChange={(event) => updateDraft("qrForeground", event.target.value.toUpperCase())}
                />
                <span className="text-sm text-ink">{draft.qrForeground}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-background">QR background</Label>
              <div className="flex items-center gap-2 rounded-[6px] border border-line bg-paper p-2">
                <input
                  id="qr-background"
                  type="color"
                  value={draft.qrBackground}
                  className="h-8 w-10 cursor-pointer rounded-[4px] border-0 bg-transparent"
                  onChange={(event) => updateDraft("qrBackground", event.target.value.toUpperCase())}
                />
                <span className="text-sm text-ink">{draft.qrBackground}</span>
              </div>
            </div>
          </div>

          {preview && (
            <aside className="mx-auto w-full max-w-[260px] rounded-[12px] border border-line bg-paper p-3 text-center">
              <p className="mb-2 text-xs font-semibold text-muted">Live QR preview</p>
              {/* A local data URL avoids a remote image host for the generated bitmap. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Styled QR code preview" className="aspect-square w-full rounded-[6px]" />
              <p className="mt-2 text-xs text-muted">The final code uses its generated short link.</p>
            </aside>
          )}

          <div className="space-y-2">
            <Label htmlFor="qr-logo">Center logo (optional)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="qr-logo"
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[6px] border border-line bg-paper px-4 text-sm font-semibold text-ink hover:bg-canvas"
              >
                {uploading ? <SpinnerGap className="animate-spin motion-reduce:animate-none" size={18} /> : <UploadSimple size={18} />}
                {uploading ? "Uploading…" : draft.qrLogoAssetId ? "Replace logo" : "Upload logo"}
              </label>
              <input
                id="qr-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={uploading || saving}
                onChange={(event) => void uploadLogo(event.target.files?.[0])}
              />
              {draft.qrLogoAssetId && (
                <>
                  <span className="inline-flex items-center gap-1 text-xs text-green"><ImageSquare size={16} /> Logo ready</span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-[6px]"
                    onClick={() => {
                      updateDraft("qrLogoAssetId", null);
                      setLogoPreviewUrl(null);
                    }}
                  >
                    Remove logo
                  </Button>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="rounded-[6px]" disabled={saving} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-[6px] bg-cyan text-white hover:bg-cyan-hover" disabled={saving || uploading}>
              {saving && <SpinnerGap className="animate-spin motion-reduce:animate-none" size={16} />}
              {saving ? "Saving…" : link ? "Save changes" : "Create link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
