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

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEvent: (event: EventItem) => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onCreateEvent,
}: CreateEventDialogProps) {
  // Step state (1 = Describe the Event, 2 = When it will happen?)
  const [step, setStep] = React.useState<1 | 2>(1);

  // Form states
  const [eventName, setEventName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [bannerFile, setBannerFile] = React.useState<File | null>(null);
  const [bannerAssetUrl, setBannerAssetUrl] = React.useState<string | null>(null);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = React.useState(false);

  // Schedule states (defaulting to current date / 1 week range)
  const [startDate, setStartDate] = React.useState<Date>(() => new Date(2026, 6, 14));
  const [startTime, setStartTime] = React.useState("9:00 am");
  const [endDate, setEndDate] = React.useState<Date>(() => new Date(2026, 6, 20));
  const [endTime, setEndTime] = React.useState("10:00 am");
  const [isSameDay, setIsSameDay] = React.useState(false);

  // Reset form when dialog closes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTimeout(() => {
        setStep(1);
        setEventName("");
        setDescription("");
        setBannerFile(null);
        setBannerAssetUrl(null);
      }, 200);
    }
    onOpenChange(nextOpen);
  };

  const handleSelectAsset = (asset: AssetItem) => {
    setBannerAssetUrl(asset.previewUrl || asset.url);
  };

  // Step 1: Save as Draft
  const handleSaveDraft = () => {
    if (!eventName.trim()) {
      alert("Please provide an event name before saving as draft.");
      return;
    }

    const resolvedImage = bannerFile
      ? URL.createObjectURL(bannerFile)
      : bannerAssetUrl || undefined;

    const newEvent: EventItem = {
      id: `evt_${Date.now()}`,
      title: eventName.trim(),
      venue: "TBD / Online",
      date: startDate.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: `${startTime} - ${endTime}`,
      status: "draft",
      registeredCount: 0,
      capacity: 100,
      image: resolvedImage,
      grad: "radial-gradient(120% 140% at 20% 10%, rgba(8,127,140,0.55), transparent 60%), linear-gradient(150deg, #12333a, var(--card))",
    };

    onCreateEvent(newEvent);
    handleOpenChange(false);
  };

  // Step 1 -> Step 2
  const handleNext = () => {
    if (!eventName.trim()) {
      alert("Please enter an event name.");
      return;
    }
    setStep(2);
  };

  // Step 2: Final Submit
  const handleSubmit = () => {
    const formattedDate = isSameDay
      ? startDate.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : `${startDate.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
        })} - ${endDate.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`;

    const resolvedImage = bannerFile
      ? URL.createObjectURL(bannerFile)
      : bannerAssetUrl || undefined;

    const newEvent: EventItem = {
      id: `evt_${Date.now()}`,
      title: eventName.trim(),
      venue: "University Campus",
      date: formattedDate,
      time: `${startTime} - ${endTime}`,
      status: "published",
      registeredCount: 0,
      capacity: 150,
      image: resolvedImage,
      grad: "radial-gradient(120% 140% at 80% 15%, rgba(41,163,136,0.5), transparent 60%), linear-gradient(150deg, #102a24, var(--card))",
    };

    onCreateEvent(newEvent);
    handleOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[94vw] sm:w-full max-w-5xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 md:p-9 bg-card rounded-2xl sm:rounded-3xl border border-line shadow-2xl font-sans">
          {/* Step Indicator & Visual Progress Bar */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Step {step}/2</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-line/50 overflow-hidden">
              <div
                className="h-full bg-[#2da482] transition-all duration-300 ease-out"
                style={{ width: step === 1 ? "50%" : "100%" }}
              />
            </div>
          </div>

          {/* 2-Column Split Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
            {/* Left Column: File Dropzone (Persists across steps) */}
            <div className="md:col-span-6 h-full">
              <EventFileDropzone
                file={bannerFile}
                assetUrl={bannerAssetUrl}
                onFileSelect={(f) => {
                  setBannerFile(f);
                  if (f) setBannerAssetUrl(null);
                }}
                onClearAssetUrl={() => setBannerAssetUrl(null)}
                onOpenLibraryPicker={() => setIsAssetPickerOpen(true)}
              />
            </div>

            {/* Right Column: Dynamic Step Form */}
            <div className="md:col-span-6 flex flex-col justify-between min-h-[360px]">
              {step === 1 ? (
                /* Step 1: Describe the Event */
                <div className="flex flex-col gap-5 flex-1 animate-in fade-in-50 duration-200">
                  <DialogTitle className="text-2xl font-bold font-display text-ink tracking-tight">
                    Describe the Event
                  </DialogTitle>

                  {/* Event Name Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-ink">
                      Event Name
                    </Label>
                    <Input
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="Create Enterprise applications on the cloud"
                      className="h-11 rounded-xl bg-card border-line px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-green/20"
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
                      className="min-h-[140px] rounded-xl bg-card border-line px-4 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-green/20"
                    />
                  </div>

                  {/* Step 1 Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      className="h-11 rounded-xl border-[#2da482] text-[#2da482] hover:bg-[#f0faf3] hover:text-[#2da482] font-semibold text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="h-11 rounded-xl bg-[#2da482] hover:bg-[#269374] text-white font-semibold text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                /* Step 2: When it will happen? */
                <div className="flex flex-col gap-5 flex-1 animate-in fade-in-50 duration-200">
                  <DialogTitle className="text-2xl font-bold font-display text-ink tracking-tight">
                    When it will happen?
                  </DialogTitle>

                  {/* Schedule Picker (Interactive Range Calendar + Inputs) */}
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
                  <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-11 rounded-xl border-[#2da482] text-[#2da482] hover:bg-[#f0faf3] hover:text-[#2da482] font-semibold text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      className="h-11 rounded-xl bg-[#2da482] hover:bg-[#269374] text-white font-semibold text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                    >
                      Submit
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
