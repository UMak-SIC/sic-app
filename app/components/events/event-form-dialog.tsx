"use client";

import * as React from "react";
import { FloppyDisk, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Asset = { id: string; originalFilename: string; mediaType: string };

export type EditableEvent = {
  id: string;
  name: string;
  details: string;
  startsAt: string;
  endsAt: string;
  imageAssetId: string | null;
};

type Props = {
  event?: EditableEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  timezone: string;
};

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
}

function toInputValue(value: string | undefined, timezone: string) {
  if (!value) return "";
  const parts = zonedParts(new Date(value), timezone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function toUtc(value: string, timezone: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const observed = zonedParts(new Date(localAsUtc), timezone);
  const observedAsUtc = Date.UTC(Number(observed.year), Number(observed.month) - 1, Number(observed.day), Number(observed.hour), Number(observed.minute));
  return new Date(localAsUtc - (observedAsUtc - localAsUtc)).toISOString();
}

export function EventFormDialog({ event, open, onOpenChange, onSaved, timezone }: Props) {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/assets/public")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setAssets(data.assets))
      .catch(() => setError("Uploaded images could not be loaded. You can still save without a banner."));
  }, [open]);

  async function submit(formData: FormData, publish: boolean) {
    setSaving(true);
    setError("");
    let imageAssetId = formData.get("imageAssetId") || null;
    const banner = formData.get("banner");
    if (banner instanceof File && banner.size > 0) {
      const upload = new FormData();
      upload.set("file", banner);
      const uploadResponse = await fetch("/api/assets/public/upload", { method: "POST", body: upload });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        setError(uploadData.error ?? "The banner could not be uploaded. Please try another image.");
        setSaving(false);
        return;
      }
      imageAssetId = uploadData.assetId;
    }
    const payload = {
      name: formData.get("name"),
      details: formData.get("details"),
      startsAt: toUtc(String(formData.get("startsAt")), timezone),
      endsAt: toUtc(String(formData.get("endsAt")), timezone),
      imageAssetId,
    };
    const response = await fetch(event ? `/api/events/${event.id}` : "/api/events", {
      method: event ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "The event could not be saved. Please try again.");
      setSaving(false);
      return;
    }

    const eventId = event?.id ?? data.event.id;
    if (publish) {
      const publishResponse = await fetch(`/api/events/${eventId}/publish`, { method: "POST" });
      const publishData = await publishResponse.json();
      if (!publishResponse.ok) {
        setError(publishData.error ?? "The draft was saved, but it could not be published.");
        setSaving(false);
        onSaved();
        return;
      }
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[94vw] max-w-2xl overflow-y-auto rounded-[12px] border-line bg-card p-6 font-sans">
        <DialogTitle className="font-display text-2xl font-bold text-ink">
          {event ? "Edit event" : "Create event"}
        </DialogTitle>
        <p className="text-sm text-muted">Times are shown in {timezone}. Save a draft first, or publish when all details are ready.</p>
        <form action={(formData) => submit(formData, false)} className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Event name
            <input name="name" required defaultValue={event?.name} className="h-10 rounded-[6px] border border-line bg-paper px-3 text-sm font-normal" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Details
            <textarea name="details" required defaultValue={event?.details} className="min-h-28 rounded-[6px] border border-line bg-paper p-3 text-sm font-normal" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Start time
              <input name="startsAt" type="datetime-local" required defaultValue={toInputValue(event?.startsAt, timezone)} className="h-10 rounded-[6px] border border-line bg-paper px-3 text-sm font-normal" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              End time
              <input name="endsAt" type="datetime-local" required defaultValue={toInputValue(event?.endsAt, timezone)} className="h-10 rounded-[6px] border border-line bg-paper px-3 text-sm font-normal" />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Event banner
            <select name="imageAssetId" defaultValue={event?.imageAssetId ?? ""} className="h-10 rounded-[6px] border border-line bg-paper px-3 text-sm font-normal">
              <option value="">No banner</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.originalFilename}</option>)}
            </select>
            <span className="text-xs font-normal text-muted">Choose an image from uploaded files. Upload a new image in the Asset library first.</span>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Upload a new banner
            <input name="banner" type="file" accept="image/png,image/jpeg,image/webp" className="rounded-[6px] border border-line bg-paper px-3 py-2 text-sm font-normal" />
            <span className="text-xs font-normal text-muted">A new image replaces the selected banner when you save.</span>
          </label>
          {error && <p role="alert" className="rounded-[6px] bg-red-soft px-3 py-2 text-sm text-red">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="submit" disabled={saving} variant="outline" className="rounded-[6px]">
              <FloppyDisk size={18} weight="bold" /> Save draft
            </Button>
            {!event && <Button type="button" disabled={saving} onClick={(action) => {
              const form = action.currentTarget.form;
              if (form?.reportValidity()) void submit(new FormData(form), true);
            }} className="rounded-[6px] bg-cyan text-white hover:bg-cyan-hover">
              <PaperPlaneTilt size={18} weight="bold" /> Save and publish
            </Button>}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
