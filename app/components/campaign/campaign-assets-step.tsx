"use client";

import * as React from "react";
import {
  Image as ImageIcon,
  FilePdf,
  Paperclip,
  PaperPlaneTilt,
  CheckCircle,
  WarningCircle,
  ArrowLeft,
  Trash,
  QrCode,
  ShieldCheck,
  FloppyDisk,
  CloudArrowUp,
  UserSwitch,
  FolderOpen,
} from "@phosphor-icons/react";
import { CampaignAssetItem } from "./campaign-types";
import { TEST_STUDENTS } from "./campaign-preview-dialog";
import { AssetPickerDialog } from "@/components/assets/asset-picker-dialog";
import { AssetItem } from "@/components/assets/asset-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CampaignAssetsStepProps {
  subject: string;
  messageContent: string;
  bannerImage: CampaignAssetItem | null;
  attachments: CampaignAssetItem[];
  testEmailAddress: string;
  studentCount?: number;
  /** The event's own venue, substituted for {{venue}}. Null drops the token. */
  eventVenue?: string | null;
  onBannerImageChange: (image: CampaignAssetItem | null) => void;
  onAttachmentsChange: (attachments: CampaignAssetItem[]) => void;
  onTestEmailAddressChange: (email: string) => void;
  onBack: () => void;
  onOpenTestSend?: () => void;
  onSubmitFinal: () => void;
  onSaveDraft?: () => void;
}

const DEFAULT_BANNER: CampaignAssetItem = {
  id: "ast_1",
  fileName: "general-assembly-banner.jpg",
  fileSize: "1.8 MB",
  fileType: "image",
  role: "banner",
};

const DEFAULT_DOC: CampaignAssetItem = {
  id: "ast_2",
  fileName: "event-program-and-guidelines.pdf",
  fileSize: "420 KB",
  fileType: "document",
  role: "attachment",
};

export function CampaignAssetsStep({
  subject,
  messageContent,
  bannerImage = DEFAULT_BANNER,
  attachments = [DEFAULT_DOC],
  testEmailAddress = "admin@umak.edu.ph",
  studentCount = 114,
  eventVenue = null,
  onBannerImageChange,
  onAttachmentsChange,
  onTestEmailAddressChange,
  onBack,
  onOpenTestSend,
  onSubmitFinal,
  onSaveDraft,
}: CampaignAssetsStepProps) {
  const [selectedStudentId, setSelectedStudentId] = React.useState("stu_1");
  const [isSendingTest, setIsSendingTest] = React.useState(false);
  const [testSentSuccess, setTestSentSuccess] = React.useState(false);
  const [testError, setTestError] = React.useState<string | null>(null);
  const [isDraggingBanner, setIsDraggingBanner] = React.useState(false);

  // Asset picker dialog states
  const [isBannerPickerOpen, setIsBannerPickerOpen] = React.useState(false);
  const [isDocPickerOpen, setIsDocPickerOpen] = React.useState(false);

  const bannerFileInputRef = React.useRef<HTMLInputElement>(null);
  const docFileInputRef = React.useRef<HTMLInputElement>(null);

  const activeStudent =
    TEST_STUDENTS.find((s) => s.id === selectedStudentId) || TEST_STUDENTS[0];

  const handleSendPracticeTest = () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      setTestError("Please enter a valid university email address.");
      setTestSentSuccess(false);
      return;
    }

    setIsSendingTest(true);
    setTestError(null);
    setTestSentSuccess(false);

    setTimeout(() => {
      setIsSendingTest(false);
      setTestSentSuccess(true);
    }, 800);
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    onBannerImageChange({
      id: "ast_" + Date.now(),
      fileName: file.name,
      fileSize: `${sizeMb} MB`,
      fileType: "image",
      role: "banner",
    });
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = Math.round(file.size / 1024);
    const sizeText = sizeKb > 1000 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
    onAttachmentsChange([
      ...attachments,
      {
        id: "ast_" + Date.now(),
        fileName: file.name,
        fileSize: sizeText,
        fileType: "document",
        role: "attachment",
      },
    ]);
  };

  const handleSelectBannerFromLibrary = (asset: AssetItem) => {
    onBannerImageChange({
      id: asset.id,
      fileName: asset.originalFilename,
      fileSize: asset.fileSizeFormatted,
      fileType: "image",
      role: "banner",
      url: asset.previewUrl || asset.url,
    });
  };

  const handleSelectDocFromLibrary = (asset: AssetItem) => {
    onAttachmentsChange([
      ...attachments,
      {
        id: asset.id,
        fileName: asset.originalFilename,
        fileSize: asset.fileSizeFormatted,
        fileType: "document",
        role: "attachment",
        url: asset.url,
      },
    ]);
  };

  const handleBannerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingBanner(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    onBannerImageChange({
      id: "ast_" + Date.now(),
      fileName: file.name,
      fileSize: `${sizeMb} MB`,
      fileType: "image",
      role: "banner",
    });
  };

  const handleAddSampleDoc = () => {
    if (docFileInputRef.current) {
      docFileInputRef.current.click();
    }
  };

  const handleRemoveAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  };

  // Interpolated live email preview body based on currently selected student
  const previewFormattedBody = React.useMemo(() => {
    const raw =
      messageContent ||
      `Hello {{student_name}},\n\nWe look forward to welcoming you to {{event_name}} on {{event_time}} in the {{venue}}!\n\nPlease have your official QR check-in pass ready on your phone or printed out upon entering the room. Check-in opens 2 hours before the session starts.\n\nSee you there!`;

    return raw
      .replace(/{{student_name}}/g, activeStudent.name)
      .replace(/{{student_id}}/g, activeStudent.studentId)
      .replace(/{{event_name}}/g, "UMak SIC General Assembly")
      .replace(/{{event_time}}/g, "Saturday, 17 Oct 2026 at 2:00 PM")
      // Previously a hardcoded room. It now reads the event's own venue, and is
      // dropped when the event has none — the same substitution the delivery
      // resolver performs, so the preview cannot promise a venue a send omits.
      .replace(/{{venue}}/g, eventVenue ?? "")
      .replace(/{{qr_ticket_pass}}/g, "");
  }, [messageContent, activeStudent, eventVenue]);

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* Hidden file pickers for actual browsing */}
      <input
        ref={bannerFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleBannerFileChange}
      />
      <input
        ref={docFileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleDocFileChange}
      />

      {/* 1. Header Card with 'Send Email' Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-[12px] border border-line shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-soft text-cyan font-bold text-[10px] uppercase tracking-wider mb-2 font-display">
            Step 3 // Banner, Files & Send
          </div>
          <h2 className="text-xl font-display font-bold text-ink tracking-tight">
            Add Banner & Finalize Announcement
          </h2>
          <p className="text-xs text-muted mt-1 font-sans">
            Add optional event banner, attach program PDFs, and test with your own inbox before broadcasting.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-xs font-semibold rounded-[6px] h-9 gap-1.5 cursor-pointer border-line"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Back</span>
          </Button>
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              className="text-xs font-semibold rounded-[6px] h-9 gap-1.5 cursor-pointer border-line"
            >
              <FloppyDisk size={14} weight="bold" className="text-muted" />
              <span>Save Draft</span>
            </Button>
          )}
          <Button
            type="button"
            onClick={onSubmitFinal}
            className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-9 px-5 gap-2 cursor-pointer shadow-xs"
          >
            <PaperPlaneTilt size={15} weight="bold" />
            <span>Send Email</span>
          </Button>
        </div>
      </div>

      {/* 2. Main 2-Column Grid (Left: 3 Action Cards, Right: Complete Email Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (6 cols): Files, Attachments & Practice Test */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Card 1: Event Header Banner */}
          <div className="bg-card rounded-[12px] border border-line p-5 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-display font-bold text-ink flex items-center gap-2">
                <ImageIcon size={18} className="text-cyan" weight="bold" />
                Event Header Banner
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBannerPickerOpen(true)}
                  className="h-7.5 text-xs font-semibold rounded-[6px] gap-1 border-line px-2.5 cursor-pointer hover:bg-canvas text-cyan"
                >
                  <FolderOpen size={13} weight="bold" />
                  <span>Choose from Library</span>
                </Button>
                {bannerImage && (
                  <button
                    type="button"
                    onClick={() => onBannerImageChange(null)}
                    className="text-xs text-red hover:underline font-medium cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {bannerImage ? (
              <div className="flex flex-col gap-3">
                {/* Active Selected Banner Item */}
                <div className="p-3 bg-paper rounded-[10px] border border-line flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[8px] bg-cyan-soft flex items-center justify-center shrink-0">
                      <ImageIcon size={20} className="text-cyan" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink font-sans truncate">
                        {bannerImage.fileName}
                      </div>
                      <div className="text-[10px] text-muted font-sans mt-0.5">
                        {bannerImage.fileSize} · Ready
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBannerPickerOpen(true)}
                      className="h-8 text-xs font-semibold rounded-[6px] border-line px-2.5 cursor-pointer text-cyan"
                    >
                      Library
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => bannerFileInputRef.current?.click()}
                      className="h-8 text-xs font-semibold rounded-[6px] border-line px-2.5 cursor-pointer"
                    >
                      Upload
                    </Button>
                  </div>
                </div>

                {/* Drag & Drop replacement dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingBanner(true);
                  }}
                  onDragLeave={() => setIsDraggingBanner(false)}
                  onDrop={handleBannerDrop}
                  className={cn(
                    "border-2 border-dashed rounded-[12px] p-4 flex flex-col items-center justify-center text-center gap-1.5 transition-colors",
                    isDraggingBanner
                      ? "border-cyan bg-cyan-soft/30"
                      : "border-line-subtle bg-paper/40"
                  )}
                >
                  <CloudArrowUp size={24} className="text-muted/80" />
                  <div className="text-xs text-ink font-sans">
                    Drop replacement banner, or{" "}
                    <button
                      type="button"
                      onClick={() => bannerFileInputRef.current?.click()}
                      className="text-cyan font-semibold underline cursor-pointer"
                    >
                      browse local
                    </button>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => setIsBannerPickerOpen(true)}
                      className="text-cyan font-semibold underline cursor-pointer"
                    >
                      pull from library
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingBanner(true);
                }}
                onDragLeave={() => setIsDraggingBanner(false)}
                onDrop={handleBannerDrop}
                className={cn(
                  "border-2 border-dashed rounded-[12px] p-7 flex flex-col items-center justify-center text-center gap-2 transition-colors",
                  isDraggingBanner
                    ? "border-cyan bg-cyan-soft/30"
                    : "border-line-subtle bg-paper/40"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-cyan-soft flex items-center justify-center text-cyan">
                  <CloudArrowUp size={22} weight="bold" />
                </div>
                <div className="text-xs text-ink font-sans">
                  Drop header banner here, or{" "}
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="text-cyan font-semibold underline cursor-pointer"
                  >
                    browse files
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBannerPickerOpen(true)}
                    className="h-8 text-xs font-semibold rounded-[6px] border-line px-3 cursor-pointer text-cyan"
                  >
                    <FolderOpen size={14} className="mr-1" />
                    Select from Asset Library
                  </Button>
                </div>
                <div className="text-[10px] text-muted font-sans mt-1">
                  Supports PNG, JPG or WebP (Recommended 1200×400px)
                </div>
              </div>
            )}
          </div>

          {/* Card 2: PDF Attachments */}
          <div className="bg-card rounded-[12px] border border-line p-5 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-display font-bold text-ink flex items-center gap-2">
                <Paperclip size={18} className="text-cyan" weight="bold" />
                PDF Attachments
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocPickerOpen(true)}
                  className="text-xs text-cyan hover:underline font-semibold cursor-pointer flex items-center gap-1"
                >
                  <FolderOpen size={13} weight="bold" />
                  <span>Library</span>
                </button>
                <span className="text-muted-light">·</span>
                <button
                  type="button"
                  onClick={handleAddSampleDoc}
                  className="text-xs text-cyan hover:underline font-semibold cursor-pointer"
                >
                  + Upload PDF
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 bg-paper rounded-[10px] border border-line flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[8px] bg-red-soft flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-red font-display tracking-tight">
                        PDF
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink font-sans truncate">
                        {att.fileName}
                      </div>
                      <div className="text-[10px] text-muted font-sans mt-0.5">
                        {att.fileSize}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-1.5 rounded-[4px] text-muted hover:text-red hover:bg-red-soft/40 transition-colors cursor-pointer"
                    aria-label="Remove attachment"
                    title="Remove attachment"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}

              {attachments.length === 0 && (
                <div className="p-5 text-center text-xs text-muted border border-dashed border-line rounded-[10px] bg-canvas/20 flex flex-col items-center justify-center gap-1.5">
                  <Paperclip size={18} className="text-muted mb-0.5" />
                  <div>
                    No PDF files attached.{" "}
                    <button
                      type="button"
                      onClick={() => setIsDocPickerOpen(true)}
                      className="text-cyan font-semibold underline cursor-pointer"
                    >
                      Pick from library
                    </button>{" "}
                    or{" "}
                    <button
                      type="button"
                      onClick={handleAddSampleDoc}
                      className="text-cyan font-semibold underline cursor-pointer"
                    >
                      upload PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Send Practice Email with Student Selection */}
          <div className="bg-card rounded-[12px] border border-line p-5 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-display font-bold text-ink">
                  Send Practice Email to Myself
                </h3>
                <p className="text-xs text-muted font-sans mt-0.5">
                  Select a student profile to test dynamic QR ticket formatting in your inbox.
                </p>
              </div>

              {onOpenTestSend && (
                <button
                  type="button"
                  onClick={onOpenTestSend}
                  className="text-xs font-semibold text-cyan hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <UserSwitch size={14} weight="bold" />
                  <span>Test Dialog</span>
                </button>
              )}
            </div>

            {/* Student Picker for Test Send */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted font-sans">
                Student Perspective:
              </label>
              <Select
                value={selectedStudentId}
                onValueChange={(val) => {
                  setSelectedStudentId(val);
                  setTestSentSuccess(false);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-paper border-line rounded-[6px] font-medium text-ink w-full">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent className="bg-card border-line rounded-[8px]">
                  {TEST_STUDENTS.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      <span className="font-semibold text-ink">{s.name}</span>
                      <span className="text-muted ml-2 font-mono text-[11px]">
                        ({s.studentId})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input & Send Test Button */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <Input
                value={testEmailAddress}
                onChange={(e) => {
                  onTestEmailAddressChange(e.target.value);
                  setTestSentSuccess(false);
                  setTestError(null);
                }}
                placeholder="admin@umak.edu.ph"
                className="h-10 text-xs bg-paper rounded-[6px] border-line font-medium text-ink flex-1"
              />
              <Button
                type="button"
                onClick={handleSendPracticeTest}
                disabled={isSendingTest}
                className="w-full sm:w-auto bg-ink hover:bg-ink-light text-paper text-xs font-semibold rounded-[6px] h-10 px-4 gap-2 cursor-pointer shadow-xs shrink-0"
              >
                <PaperPlaneTilt size={15} weight="bold" />
                <span>{isSendingTest ? "Sending..." : "Send test to my email"}</span>
              </Button>
            </div>

            {testSentSuccess && (
              <div className="p-3 bg-green-soft border border-green-border rounded-[8px] text-xs text-green flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle size={16} className="text-green shrink-0" weight="bold" />
                <span>
                  Practice email for <strong className="font-bold">{activeStudent.name}</strong> sent to{" "}
                  <strong className="font-bold">{testEmailAddress}</strong>. Check your inbox!
                </span>
              </div>
            )}

            {testError && (
              <div className="p-3 bg-red-soft border border-red-border rounded-[8px] text-xs text-red flex items-center gap-2 animate-in fade-in duration-200">
                <WarningCircle size={16} className="text-red shrink-0" weight="bold" />
                <span>{testError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (6 cols): Complete Live Email Preview */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-card rounded-[16px] border border-line p-5 shadow-xs flex flex-col gap-4">
            {/* Window Header Strip */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green inline-block shrink-0" />
                <span className="text-xs font-display font-bold text-ink uppercase tracking-wider">
                  COMPLETE EMAIL PREVIEW
                </span>
              </div>
              <span className="text-[11px] text-muted font-sans">
                Includes unique QR ticket
              </span>
            </div>

            {/* Email Client Reading Window */}
            <div className="bg-paper border border-line rounded-[12px] overflow-hidden shadow-2xs flex flex-col">
              {/* Webmail Bar */}
              <div className="px-4 py-2 bg-canvas/60 border-b border-line flex items-center justify-between text-xs">
                <span className="text-muted font-sans font-medium text-[11px]">
                  UMak Webmail · Student Perspective ({activeStudent.name})
                </span>
                <span className="text-[10px] font-semibold text-muted bg-canvas border border-line px-2 py-0.5 rounded-[4px]">
                  Inbox
                </span>
              </div>

              {/* Email Content Area */}
              <div className="p-5 flex flex-col gap-4 text-xs text-ink">
                {/* Email Subject Title */}
                <h3 className="text-base sm:text-lg font-display font-bold text-ink tracking-tight leading-snug">
                  {subject || "Reminder: UMak SIC General Assembly this Saturday!"}
                </h3>

                {/* Sender & Recipient Metadata Row */}
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-cyan text-white font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    SIC
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex flex-wrap items-baseline gap-1 text-xs truncate">
                      <span className="font-bold text-ink">UMak CCIS Society</span>
                      <span className="text-[11px] text-muted font-mono truncate">
                        &lt;sic-announcements@umak.edu.ph&gt;
                      </span>
                    </div>
                    <div className="text-[11px] text-muted font-sans truncate">
                      to {activeStudent.name} &lt;{activeStudent.email}&gt;
                    </div>
                  </div>
                </div>

                {/* Event Header Banner (if present) */}
                {bannerImage && (
                  <div className="rounded-[10px] overflow-hidden bg-ink text-paper p-5 text-center flex flex-col items-center justify-center shadow-xs border border-ink/40 relative">
                    <div className="text-[10px] uppercase tracking-widest text-cyan-soft font-bold font-display">
                      UNIVERSITY OF MAKATI · STUDENT INFORMATION CENTER
                    </div>
                    <div className="text-base sm:text-lg font-display font-bold mt-1 text-white tracking-tight">
                      UMak SIC General Assembly
                    </div>
                  </div>
                )}

                {/* Body Copy Text */}
                <div className="text-xs text-ink/90 whitespace-pre-line leading-relaxed font-sans pt-1">
                  {previewFormattedBody}
                </div>

                {/* PDF Attachments Pills */}
                {attachments.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-canvas/80 border border-line text-xs font-medium text-ink"
                      >
                        <span className="text-[10px] font-bold text-red font-display tracking-tight">
                          PDF
                        </span>
                        <span className="text-xs">{att.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Official Check-In QR Ticket Pass Box */}
                <div className="mt-1 p-3.5 bg-cyan-soft/20 border border-cyan-border rounded-[12px] flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[8px] bg-cyan-soft flex items-center justify-center shrink-0">
                      <QrCode size={22} className="text-cyan" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-display font-bold text-ink">
                        Official Check-In QR Ticket Pass
                      </div>
                      <div className="text-[10px] text-muted font-sans truncate">
                        Generated for {activeStudent.name} ({activeStudent.studentId})
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-soft/80 border border-cyan-border text-cyan font-sans shrink-0">
                    Included
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Reassuring Operator Safety Footer Card */}
      <div className="p-4 bg-green-soft border border-green-border rounded-[12px] text-xs text-ink flex items-start gap-3 shadow-2xs">
        <ShieldCheck size={20} className="text-green shrink-0 mt-0.5" weight="bold" />
        <div className="leading-relaxed font-sans">
          <strong className="font-semibold text-green font-display">Ready to publish:</strong>{" "}
          When you click Send Email, all {studentCount} registered students will receive their personalized announcement and unique QR pass. Duplicate emails are always prevented.
        </div>
      </div>

      {/* Banner Library Picker Modal */}
      <AssetPickerDialog
        open={isBannerPickerOpen}
        onOpenChange={setIsBannerPickerOpen}
        categoryFilter="image"
        onSelectAsset={handleSelectBannerFromLibrary}
        title="Select Announcement Banner"
        description="Choose an existing uploaded hero graphic from your media library."
      />

      {/* PDF Document Library Picker Modal */}
      <AssetPickerDialog
        open={isDocPickerOpen}
        onOpenChange={setIsDocPickerOpen}
        categoryFilter="document"
        onSelectAsset={handleSelectDocFromLibrary}
        title="Attach Document from Library"
        description="Select an existing program guide or certificate PDF to attach."
      />
    </div>
  );
}
