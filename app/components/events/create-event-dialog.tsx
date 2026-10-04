"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EventFileDropzone } from "./event-file-dropzone";
import { EventSchedulePicker } from "./event-schedule-picker";
import { EventItem } from "./events-table";
import { AssetPickerDialog } from "@/components/assets/asset-picker-dialog";
import { AssetItem } from "@/components/assets/asset-types";
import { MapPin, FloppyDisk, PaperPlaneTilt, CircleNotch } from "@phosphor-icons/react";

export type EditableEvent = {
  id: string;
  name: string;
  details: string;
  venue: string | null;
  startsAt: string;
  endsAt: string;
  imageAssetId: string | null;
  bannerUrl?: string | null;
};

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EditableEvent;
  timezone?: string;
  onSaved?: () => void;
  onCreateEvent?: (event: EventItem) => void;
}

function parseTimeToAmPm(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${mStr} ${period}`;
}

function combineDateAndTime(d: Date, timeStr: string): string {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  let hour = 9;
  let min = 0;
  if (match) {
    hour = parseInt(match[1], 10);
    min = parseInt(match[2], 10);
    const period = match[3]?.toLowerCase();
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
  }
  const dateObj = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, min, 0);
  return dateObj.toISOString();
}

export function CreateEventDialog({
  open,
  onOpenChange,
  event,
  timezone,
  onSaved,
  onCreateEvent,
}: CreateEventDialogProps) {
  // Step state (1 = Describe the Event, 2 = When it will happen?)
  const [step, setStep] = React.useState<1 | 2>(1);

  // Form states
  const [eventName, setEventName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [bannerFile, setBannerFile] = React.useState<File | null>(null);
  const [bannerAssetId, setBannerAssetId] = React.useState<string | null>(null);
  const [bannerAssetUrl, setBannerAssetUrl] = React.useState<string | null>(null);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = React.useState(false);

  // Schedule states
  const [startDate, setStartDate] = React.useState<Date>(() => new Date());
  const [startTime, setStartTime] = React.useState("9:00 am");
  const [endDate, setEndDate] = React.useState<Date>(() => new Date());
  const [endTime, setEndTime] = React.useState("10:00 am");
  const [isSameDay, setIsSameDay] = React.useState(true);

  // API states
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // Sync state when editing existing event or opening modal
  React.useEffect(() => {
    if (!open) return;

    if (event) {
      setEventName(event.name || "");
      setDescription(event.details || "");
      setVenue(event.venue || "");
      setBannerAssetId(event.imageAssetId || null);
      setBannerAssetUrl(event.bannerUrl || null);
      setBannerFile(null);

      if (event.startsAt) {
        const sDate = new Date(event.startsAt);
        setStartDate(sDate);
        setStartTime(parseTimeToAmPm(sDate));
      }
      if (event.endsAt) {
        const eDate = new Date(event.endsAt);
        setEndDate(eDate);
        setEndTime(parseTimeToAmPm(eDate));
      }
    } else {
      const now = new Date();
      setEventName("");
      setDescription("");
      setVenue("");
      setBannerFile(null);
      setBannerAssetId(null);
      setBannerAssetUrl(null);
      setStartDate(now);
      setStartTime("9:00 am");
      setEndDate(now);
      setEndTime("10:00 am");
      setIsSameDay(true);
      setStep(1);
    }
    setError("");
  }, [open, event]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTimeout(() => {
        setStep(1);
        setError("");
      }, 200);
    }
    onOpenChange(nextOpen);
  };

  const handleSelectAsset = (asset: AssetItem) => {
    setBannerAssetId(asset.id);
    setBannerAssetUrl(asset.previewUrl || asset.url);
    setBannerFile(null);
  };

  // Step 1 -> Step 2
  const handleNext = () => {
    if (!eventName.trim()) {
      setError("Please enter an event name before proceeding.");
      return;
    }
    setError("");
    setStep(2);
  };

  // Submit handler (Draft or Publish)
  const handleSave = async (publish: boolean) => {
    if (!eventName.trim()) {
      setError("Event name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let resolvedImageAssetId = bannerAssetId;

      // Upload banner file if one was selected
      if (bannerFile && bannerFile.size > 0) {
        const uploadData = new FormData();
        uploadData.set("file", bannerFile);
        const uploadRes = await fetch("/api/assets/public/upload", {
          method: "POST",
          body: uploadData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadJson.error ?? "Banner could not be uploaded. Please try again.");
          setSaving(false);
          return;
        }
        resolvedImageAssetId = uploadJson.assetId;
      }

      const startsAtIso = combineDateAndTime(startDate, startTime);
      const endsAtIso = combineDateAndTime(isSameDay ? startDate : endDate, endTime);

      const payload = {
        name: eventName.trim(),
        details: description.trim() || "No details provided.",
        venue: venue.trim() || null,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        imageAssetId: resolvedImageAssetId,
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

      const savedEvent = data.event || data;
      const eventId = event?.id ?? savedEvent.id;

      if (publish && eventId) {
        const publishRes = await fetch(`/api/events/${eventId}/publish`, { method: "POST" });
        const publishData = await publishRes.json();
        if (!publishRes.ok) {
          setError(publishData.error ?? "The draft was saved, but publishing failed.");
          setSaving(false);
          onSaved?.();
          return;
        }
      }

      // Callback fallback for optimistic UI / local state
      if (onCreateEvent) {
        const localItem: EventItem = {
          id: eventId || `evt_${Date.now()}`,
          title: eventName.trim(),
          venue: venue.trim() || "Campus",
          date: isSameDay
            ? startDate.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
            : `${startDate.toLocaleDateString("en-US", { day: "2-digit", month: "short" })} - ${endDate.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}`,
          time: `${startTime} - ${endTime}`,
          status: publish ? "published" : "draft",
          registeredCount: 0,
          capacity: 100,
          image: bannerAssetUrl || (bannerFile ? URL.createObjectURL(bannerFile) : undefined),
          grad: "radial-gradient(120% 140% at 80% 15%, rgba(41,163,136,0.5), transparent 60%), linear-gradient(150deg, #102a24, var(--card))",
        };
        onCreateEvent(localItem);
      }

      setSaving(false);
      onSaved?.();
      handleOpenChange(false);
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[95vw] sm:w-full max-w-5xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 md:p-8 bg-card rounded-2xl sm:rounded-3xl border border-line shadow-2xl font-sans">
          {/* Step Indicator & Visual Progress Bar matching Mockups */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Step {step}/2</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-line/60 overflow-hidden">
              <div
                className="h-full bg-[#2da482] transition-all duration-300 ease-out"
                style={{ width: step === 1 ? "50%" : "100%" }}
              />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div role="alert" className="mb-4 rounded-xl bg-red-soft border border-red-border px-4 py-2.5 text-xs font-semibold text-red animate-in fade-in-50">
              {error}
            </div>
          )}

          {/* 2-Column Split Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
            {/* Left Column: File Dropzone (Persists across steps) */}
            <div className="md:col-span-6 h-full min-h-[340px]">
              <EventFileDropzone
                file={bannerFile}
                assetUrl={bannerAssetUrl}
                onFileSelect={(f) => {
                  setBannerFile(f);
                  if (f) {
                    setBannerAssetUrl(null);
                    setBannerAssetId(null);
                  }
                }}
                onClearAssetUrl={() => {
                  setBannerAssetUrl(null);
                  setBannerAssetId(null);
                }}
                onOpenLibraryPicker={() => setIsAssetPickerOpen(true)}
              />
            </div>

            {/* Right Column: Dynamic Step Form */}
            <div className="md:col-span-6 flex flex-col justify-between min-h-[360px]">
              {step === 1 ? (
                /* Part 1: Describe the Event */
                <div className="flex flex-col gap-4 flex-1 animate-in fade-in-50 duration-200">
                  <DialogTitle className="text-2xl font-bold font-display text-ink tracking-tight">
                    Describe the Event
                  </DialogTitle>

                  {/* Event Name Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-ink">
                      Event Name<span className="text-[#2da482] ml-0.5">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="Create Enterprise applications on the cloud"
                      className="h-10 rounded-xl bg-card border-line px-3.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[#2da482]/20"
                    />
                  </div>

                  {/* Event Description Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-ink">
                      Description
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell attendees what this event is about, learning objectives, and agenda..."
                      className="min-h-[100px] rounded-xl bg-card border-line px-3.5 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[#2da482]/20"
                    />
                  </div>

                  {/* Venue Input (Under Description) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-ink flex items-center gap-1">
                      <MapPin size={13} className="text-[#2da482]" />
                      <span>Venue</span>
                    </Label>
                    <Input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g., Grand Amphitheater, Bldg 2 Room 304, or Online"
                      className="h-10 rounded-xl bg-card border-line px-3.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[#2da482]/20"
                    />
                  </div>

                  {/* Step 1 Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-auto pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => handleSave(false)}
                      className="h-10 rounded-xl border-[#2da482] text-[#2da482] hover:bg-[#f0faf3] hover:text-[#2da482] font-semibold text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                    >
                      {saving ? (
                        <CircleNotch size={16} className="animate-spin mr-1.5" />
                      ) : (
                        <FloppyDisk size={16} weight="bold" className="mr-1.5" />
                      )}
                      <span>Save Draft</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="h-10 rounded-xl bg-[#2da482] hover:bg-[#269374] text-white font-semibold text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                /* Part 2: When it will happen? */
                <div className="flex flex-col gap-4 flex-1 animate-in fade-in-50 duration-200">
                  <DialogTitle className="text-2xl font-bold font-display text-ink tracking-tight">
                    When it will happen?
                  </DialogTitle>

                  {/* Schedule Picker with Interactive Calendar and Clock Pickers */}
                  <EventSchedulePicker
                    startDate={startDate}
                    onStartDateChange={setStartDate}
                    startTime={startTime}
                    onStartTimeChange={setStartTime}
                    endDate={endDate}
                    onEndDateChange={setEndDate}
                    endTime={endTime}
                    onEndTimeChange={setEndTime}
                    isSameDay={isSameDay}
                    onIsSameDayChange={setIsSameDay}
                  />

                  {/* Step 2 Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-auto pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => setStep(1)}
                      className="h-10 rounded-xl border-line text-ink hover:bg-canvas font-semibold text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.98]"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => handleSave(false)}
                      className="h-10 rounded-xl border-[#2da482] text-[#2da482] hover:bg-[#f0faf3] hover:text-[#2da482] font-semibold text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                    >
                      {saving ? <CircleNotch size={14} className="animate-spin mr-1" /> : <FloppyDisk size={14} weight="bold" className="mr-1" />}
                      <span>Save Draft</span>
                    </Button>
                    <Button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSave(true)}
                      className="h-10 rounded-xl bg-[#2da482] hover:bg-[#269374] text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                    >
                      {saving ? (
                        <CircleNotch size={14} className="animate-spin mr-1" />
                      ) : (
                        <PaperPlaneTilt size={14} weight="bold" className="mr-1" />
                      )}
                      <span>Publish</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset Picker Modal */}
      <AssetPickerDialog
        open={isAssetPickerOpen}
        onOpenChange={setIsAssetPickerOpen}
        categoryFilter="image"
        onSelectAsset={handleSelectAsset}
        title="Select Event Cover from Library"
        description="Choose an existing uploaded hero banner from your media library."
      />
    </>
  );
}
