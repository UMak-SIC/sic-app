"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  TextB,
  TextItalic,
  ListBullets,
  Link as LinkIcon,
  FloppyDisk,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { renderEmailMarkdownPreview, splitPreviewAtQrTicketPass } from "./email-markdown-preview";

interface CampaignComposerStepProps {
  eventId: string;
  eventName: string;
  subject: string;
  messageContent: string;
  includeOfficers: boolean;
  organizerCount?: number;
  studentCount?: number;
  onSubjectChange: (subject: string) => void;
  onMessageContentChange: (content: string) => void;
  onIncludeOfficersChange: (include: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
}

/**
 * The only tokens offered in the composer.
 *
 * Kept in step with the delivery resolver's supported set: a token offered here
 * but absent there is stripped from the real send, so the author would preview
 * one thing and send another. The QR pass uses a static visual in the composer
 * because a signed ticket only exists for an individual delivery.
 */
const EASY_INSERTS: { label: string; token: string }[] = [
  { label: "Student Name", token: "{{student_name}}" },
  { label: "Student Number", token: "{{student_id}}" },
  { label: "Section", token: "{{section}}" },
  { label: "Event Name", token: "{{event_name}}" },
  { label: "Date & Time", token: "{{event_time}}" },
  { label: "Venue", token: "{{venue}}" },
  { label: "QR Pass Card", token: "{{qr_ticket_pass}}" },
];

export function CampaignComposerStep({
  eventId,
  eventName = "UMak SIC General Assembly",
  subject,
  messageContent,
  includeOfficers,
  organizerCount = 0,
  studentCount = 118,
  onSubjectChange,
  onMessageContentChange,
  onIncludeOfficersChange,
  onBack,
  onContinue,
  onSaveDraft,
}: CampaignComposerStepProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleInsertToken = (token: string) => {
    if (!textareaRef.current) {
      onMessageContentChange(messageContent + " " + token);
      return;
    }

    const start = textareaRef.current.selectionStart ?? messageContent.length;
    const end = textareaRef.current.selectionEnd ?? messageContent.length;
    const text = messageContent;
    const updated = text.substring(0, start) + token + text.substring(end);
    onMessageContentChange(updated);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + token.length, start + token.length);
      }
    }, 0);
  };

  const handleFormatText = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart ?? 0;
    const end = textareaRef.current.selectionEnd ?? 0;
    const text = messageContent;
    const selected = text.substring(start, end);
    const updated =
      text.substring(0, start) + prefix + (selected || "text") + suffix + text.substring(end);
    onMessageContentChange(updated);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = start + prefix.length + (selected.length || 4);
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  const handleHeading = (prefix: "# " | "## " | "### ") => {
    if (!textareaRef.current) {
      onMessageContentChange(`${messageContent}${messageContent ? "\n" : ""}${prefix}`);
      return;
    }

    const start = textareaRef.current.selectionStart ?? messageContent.length;
    const lineStart = messageContent.lastIndexOf("\n", start - 1) + 1;
    onMessageContentChange(`${messageContent.slice(0, lineStart)}${prefix}${messageContent.slice(lineStart)}`);
  };

  const [previewBeforeTicket, previewAfterTicket] = React.useMemo(() => {
    const [beforeTicket, afterTicket] = splitPreviewAtQrTicketPass(messageContent || "");
    const format = (raw: string) => raw
      .replace(/{{student_name}}/g, "Andrea Santos")
      .replace(/{{student_id}}/g, "2023-00182-MK")
      .replace(/{{event_name}}/g, eventName || "UMak SIC General Assembly")
      .replace(/{{event_time}}/g, "Saturday, 17 Oct 2026 at 2:00 PM")
      .replace(/{{venue}}/g, "Audio Visual Room");

    return [format(beforeTicket), format(afterTicket)];
  }, [messageContent, eventName]);
  const hasQrTicketPass = splitPreviewAtQrTicketPass(messageContent).at(2);

  const charCount = messageContent.length;

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* 1. Top Step Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-[12px] border border-line shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-soft text-cyan font-bold text-[10px] uppercase tracking-wider mb-2 font-display">
            Step 2 // Message Content
          </div>
          <h2 className="text-xl font-display font-bold text-ink tracking-tight">
            Write Announcement Message
          </h2>
          <p className="text-xs text-muted mt-1 font-sans">
            Craft your email. Dynamic tokens will automatically inject student recipient specifics.
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
            onClick={onContinue}
            className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-9 gap-1.5 cursor-pointer"
          >
            <span>Next: Banner & Preview</span>
            <ArrowRight size={14} weight="bold" />
          </Button>
        </div>
      </div>

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Gmail Style Announcement Composer */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Outer Composer Card */}
          <div className="bg-card rounded-[12px] border border-line shadow-xs overflow-hidden flex flex-col">
            {/* Dark Top Header Bar */}
            <div className="bg-ink px-4 py-2.5 flex items-center justify-between text-xs select-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan inline-block animate-pulse" />
                <span className="font-display font-bold text-paper text-xs tracking-tight">
                  Announcement Draft
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-paper/75 font-sans">
                <Check size={13} weight="bold" className="text-cyan" />
                <span>Saved just now</span>
              </div>
            </div>

            {/* Email Metadata Fields (Gmail Style) */}
            <div className="flex flex-col text-xs border-b border-line-subtle bg-paper/30">
              {/* Audience Row */}
              <div className="flex items-center px-4 py-2.5 border-b border-line-subtle gap-3">
                <span className="w-16 shrink-0 font-medium text-muted text-xs">
                  Audience:
                </span>
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-soft border border-cyan-border text-xs font-semibold text-ink">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
                    <span className="truncate">{eventName} ({studentCount} Registrants)</span>
                    <button
                      type="button"
                      onClick={onBack}
                      title="Change audience event"
                      className="text-muted hover:text-ink cursor-pointer ml-0.5 p-0.5 rounded-full hover:bg-cyan-border/40"
                    >
                      <X size={11} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>

              {/* From Row */}
              <div className="flex items-center px-4 py-2.5 border-b border-line-subtle gap-3">
                <span className="w-16 shrink-0 font-medium text-muted text-xs">
                  From:
                </span>
                <div className="flex items-center gap-1.5 text-xs text-ink font-medium">
                  <span className="font-semibold text-ink">UMak CCIS Society</span>
                  <span className="text-muted font-mono text-[11px]">
                    &lt;sic-announcements@umak.edu.ph&gt;
                  </span>
                </div>
              </div>

              {/* Subject Row */}
              <div className="flex items-center px-4 py-2.5 gap-3">
                <span className="w-16 shrink-0 font-medium text-muted text-xs">
                  Subject:
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => onSubjectChange(e.target.value)}
                  placeholder="e.g. Reminder: UMak SIC General Assembly this Saturday!"
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-ink placeholder:text-muted-light focus:outline-none"
                />
              </div>
            </div>

            {/* Token Toolbar */}
            <div className="px-4 py-2.5 bg-canvas/40 border-b border-line-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider font-display shrink-0">
                  INSERT TOKEN
                </span>
              </div>
              <span className="text-[10px] text-muted-light font-sans hidden sm:inline">
                Inserts at cursor
              </span>
            </div>

            {/* Pill Buttons for Tokens */}
            <div className="px-4 py-2 bg-paper/40 border-b border-line-subtle flex flex-wrap items-center gap-1.5">
              {EASY_INSERTS.map((item) => (
                <button
                  key={item.token}
                  type="button"
                  onClick={() => handleInsertToken(item.token)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-card hover:bg-cyan-soft border border-line hover:border-cyan-border text-[11px] font-semibold text-ink transition-colors cursor-pointer"
                >
                  <Plus size={11} className="text-cyan" weight="bold" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Message Body Textarea & Embedded QR Pass Indicator */}
            <div className="p-4 flex flex-col gap-3 bg-card min-h-[280px]">
              <textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => onMessageContentChange(e.target.value)}
                placeholder="Hello {{student_name}},&#10;&#10;We look forward to welcoming you to {{event_name}} on {{event_time}} in the {{venue}}!&#10;&#10;Please have your official QR check-in pass ready on your phone or printed out upon entering the room. Check-in opens 2 hours before the session starts.&#10;&#10;See you there!"
                className="w-full min-h-[170px] text-xs font-mono bg-paper/50 rounded-[8px] border border-line p-3.5 text-ink leading-relaxed resize-y focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/20"
              />

            </div>

            {/* Bottom Gmail-Style Toolbar */}
            <div className="px-4 py-2.5 bg-paper/60 border-t border-line flex items-center justify-between">
              <div className="flex items-center gap-1 text-muted">
                <button
                  type="button"
                  onClick={() => handleFormatText("**", "**")}
                  title="Bold"
                  aria-label="Bold text"
                  className="p-1.5 rounded-[4px] hover:bg-canvas hover:text-ink text-xs font-bold cursor-pointer"
                >
                  <TextB size={15} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatText("__", "__")}
                  title="Italic"
                  aria-label="Italic text"
                  className="p-1.5 rounded-[4px] hover:bg-canvas hover:text-ink text-xs italic cursor-pointer"
                >
                  <TextItalic size={15} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatText("\n- ", "")}
                  title="Bullet list"
                  aria-label="Bullet list"
                  className="p-1.5 rounded-[4px] hover:bg-canvas hover:text-ink cursor-pointer"
                >
                  <ListBullets size={15} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatText("[", "](https://)")}
                  title="Insert link"
                  aria-label="Insert link"
                  className="p-1.5 rounded-[4px] hover:bg-canvas hover:text-ink cursor-pointer"
                >
                  <LinkIcon size={15} weight="bold" />
                </button>
                <button type="button" onClick={() => handleHeading("# ")} title="Heading 1" aria-label="Heading 1" className="px-1.5 py-1 rounded-[4px] hover:bg-canvas hover:text-ink text-[11px] font-bold cursor-pointer">H1</button>
                <button type="button" onClick={() => handleHeading("## ")} title="Heading 2" aria-label="Heading 2" className="px-1.5 py-1 rounded-[4px] hover:bg-canvas hover:text-ink text-[11px] font-bold cursor-pointer">H2</button>
                <button type="button" onClick={() => handleHeading("### ")} title="Heading 3" aria-label="Heading 3" className="px-1.5 py-1 rounded-[4px] hover:bg-canvas hover:text-ink text-[11px] font-bold cursor-pointer">H3</button>
                <button type="button" onClick={() => handleFormatText("<center>", "</center>")} title="Center text" aria-label="Center text" className="px-1.5 py-1 rounded-[4px] hover:bg-canvas hover:text-ink text-[11px] font-bold cursor-pointer">Center</button>
              </div>

              <div className="text-[11px] font-sans text-muted tabular-nums">
                {charCount} characters
              </div>
            </div>
          </div>

          {/* Officer BCC Checkbox Card */}
          <div className="bg-card rounded-[12px] border border-line p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="officers-check"
                checked={includeOfficers}
                onCheckedChange={(checked) => onIncludeOfficersChange(!!checked)}
                className="rounded-[4px] border-line data-[state=checked]:bg-cyan data-[state=checked]:border-cyan mt-0.5 cursor-pointer"
              />
              <div className="flex flex-col">
                <label
                  htmlFor="officers-check"
                  className="text-xs font-bold text-ink cursor-pointer select-none font-sans"
                >
                  Also send a copy to event organizers
                </label>
                <p className="text-[11px] text-muted font-sans mt-0.5">
                  Sends a copy to the selected event organizers.
                </p>
              </div>
            </div>

            <span className="shrink-0 bg-canvas text-muted border border-line rounded-full px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold font-sans">
               {organizerCount} {organizerCount === 1 ? "organizer" : "organizers"}
            </span>
          </div>
        </div>

        {/* Right Column (5 cols): Student Inbox Preview */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Header Title with Status Dot */}
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
            <h3 className="font-display font-bold text-xs text-ink uppercase tracking-wider">
              Student Inbox Preview
            </h3>
          </div>

          {/* Webmail Client Mockup Frame */}
          <div className="bg-card rounded-[12px] border border-line shadow-xs overflow-hidden flex flex-col">
            {/* Webmail Window Header */}
            <div className="px-4 py-2.5 bg-canvas/60 border-b border-line flex items-center justify-between text-xs">
              <span className="font-sans font-semibold text-muted text-[11px]">
                UMak Webmail · Student Perspective
              </span>
              <span className="font-sans font-medium text-muted-light text-[11px]">
                Inbox
              </span>
            </div>

            {/* Email Reading Pane */}
            <div className="p-5 bg-paper flex flex-col gap-4 text-xs text-ink">
              {/* Email Subject Line & Timestamp */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-line-subtle">
                <h4 className="font-display font-bold text-sm sm:text-base text-ink tracking-tight leading-snug">
                  {subject || "Reminder: UMak SIC General Assembly this Saturday!"}
                </h4>
                <span className="text-[10px] font-medium text-muted bg-canvas border border-line px-2 py-0.5 rounded-[4px] shrink-0">
                  Just now
                </span>
              </div>

              {/* Sender & Recipient Information */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-ink text-paper font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  SIC
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex flex-wrap items-baseline gap-1 text-xs truncate">
                    <span className="font-bold text-ink">UMak CCIS Society</span>
                    <span className="text-[11px] text-muted truncate">
                      &lt;sic-announcements@umak.edu.ph&gt;
                    </span>
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    to Andrea Santos &lt;andrea.santos@umak.edu.ph&gt;
                  </div>
                </div>
              </div>

              {/* Dynamic Email Body Text */}
              <div className="text-xs text-ink/90 whitespace-pre-line leading-relaxed font-sans pt-1 min-h-[110px]">
                {previewBeforeTicket ? renderEmailMarkdownPreview(previewBeforeTicket) : "Type your message on the left to see live preview..."}
              </div>

              {hasQrTicketPass && (
                <div className="rounded-[12px] border border-line bg-card p-4 shadow-xs flex flex-col gap-3.5">
                {/* Top Pass Brand Strip */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-[4px] bg-ink text-paper font-display font-bold text-[10px] flex items-center justify-center">
                      SIC
                    </div>
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-xs text-ink leading-tight">
                        UMak CCIS Pass
                      </span>
                      <span className="text-[10px] text-muted font-sans leading-none">
                        General Assembly 2026
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-soft border border-green-border text-green font-bold text-[10px]">
                    <Check size={11} weight="bold" />
                    <span>VALID PASS</span>
                  </div>
                </div>

                {/* Pass Details + QR Matrix Section */}
                <div className="grid grid-cols-12 gap-3 items-center pt-1">
                  {/* Left Column: Attendee Metadata */}
                  <div className="col-span-7 flex flex-col gap-2.5 text-left">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted font-display block">
                        ATTENDEE NAME
                      </span>
                      <span className="font-display font-bold text-xs sm:text-sm text-ink block truncate">
                        Andrea Santos
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted font-display block">
                        STUDENT ID NUMBER
                      </span>
                      <span className="font-mono text-[11px] font-bold text-ink block">
                        2023-00182-MK
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted font-display block">
                        HALL ACCESS
                      </span>
                      <span className="text-[11px] font-semibold text-cyan block font-sans">
                        AVR · Gate 2 Access
                      </span>
                    </div>
                  </div>

                  {/* Right Column: QR Code Representation */}
                  <div className="col-span-5 flex flex-col items-center justify-center p-2 rounded-[8px] bg-paper border border-line">
                    {/* Realistic SVG QR Matrix Graphic */}
                    <svg
                      viewBox="0 0 100 100"
                      className="w-20 h-20 text-ink"
                      fill="currentColor"
                      aria-label="Preview QR ticket pass"
                    >
                      {/* Top-Left Finder */}
                      <rect x="5" y="5" width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                      <rect x="14" y="14" width="12" height="12" rx="2" fill="currentColor" />

                      {/* Top-Right Finder */}
                      <rect x="65" y="5" width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                      <rect x="74" y="14" width="12" height="12" rx="2" fill="currentColor" />

                      {/* Bottom-Left Finder */}
                      <rect x="5" y="65" width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                      <rect x="14" y="74" width="12" height="12" rx="2" fill="currentColor" />

                      {/* Data Modules */}
                      <rect x="42" y="10" width="6" height="6" rx="1" />
                      <rect x="52" y="10" width="6" height="6" rx="1" />
                      <rect x="42" y="22" width="6" height="6" rx="1" />
                      <rect x="10" y="42" width="6" height="6" rx="1" />
                      <rect x="22" y="42" width="6" height="6" rx="1" />
                      <rect x="42" y="42" width="16" height="16" rx="2" />
                      <rect x="65" y="42" width="6" height="6" rx="1" />
                      <rect x="77" y="42" width="6" height="6" rx="1" />
                      <rect x="85" y="50" width="6" height="6" rx="1" />
                      <rect x="42" y="65" width="6" height="6" rx="1" />
                      <rect x="52" y="75" width="6" height="6" rx="1" />
                      <rect x="65" y="65" width="10" height="10" rx="1" />
                      <rect x="80" y="75" width="10" height="10" rx="1" />
                    </svg>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted font-display mt-1 text-center">
                      PREVIEW QR PASS
                    </span>
                  </div>
                </div>

                {/* Dashed Separator */}
                <div className="border-t border-dashed border-line pt-2 flex items-center justify-between text-[10px] text-muted">
                  <span className="font-mono text-[10px] text-muted-light">
                    Auth Hash: 8b1a...f42c
                  </span>
                  <span className="font-sans text-muted">
                    University of Makati CCIS
                  </span>
                </div>
                </div>
              )}

              {hasQrTicketPass && previewAfterTicket && (
                <div className="text-xs text-ink/90 whitespace-pre-line leading-relaxed font-sans pt-1">
                  {renderEmailMarkdownPreview(previewAfterTicket)}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Note */}
          <div className="flex items-center gap-1.5 px-2 text-[11px] text-muted font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan inline-block" />
            <span>Sample preview: Andrea Santos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
