"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  QrCode,
  PaperPlaneTilt,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  FilePdf,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignAssetItem } from "./campaign-types";
import { sendTestEmail } from "@/lib/email/send-test-email";

export interface StudentOption {
  id: string;
  name: string;
  studentId: string;
  email: string;
  course: string;
  program: string;
  /** The year and block, e.g. "BSIT-2A". Substituted for {{section}}. */
  section: string;
  hasPriorDelivery?: boolean;
}

export const SAMPLE_STUDENTS: StudentOption[] = [
  {
    id: "stu_1",
    name: "Andrea Santos",
    studentId: "2023-00182",
    email: "andrea.santos@umak.edu.ph",
    course: "BSIT",
    program: "BS Information Technology",
    section: "BSIT-2A",
    hasPriorDelivery: false,
  },
  {
    id: "stu_2",
    name: "Miguel Dela Cruz",
    studentId: "2023-00491",
    email: "miguel.delacruz@umak.edu.ph",
    course: "BSCS",
    program: "BS Computer Science",
    section: "BSCS-2B",
    hasPriorDelivery: false,
  },
  {
    id: "stu_3",
    name: "Bianca Flores",
    studentId: "2023-00612",
    email: "bianca.flores@umak.edu.ph",
    course: "BSINS",
    program: "BS Information Systems",
    section: "BSINS-1A",
    hasPriorDelivery: true,
  },
  {
    id: "stu_4",
    name: "Joshua Ramos",
    studentId: "2022-01934",
    email: "joshua.ramos@umak.edu.ph",
    course: "BSIT",
    program: "BS Information Technology",
    section: "BSIT-3C",
    hasPriorDelivery: false,
  },
  {
    id: "stu_5",
    name: "Patricia Reyes",
    studentId: "2023-00823",
    email: "patricia.reyes@umak.edu.ph",
    course: "BSCS",
    program: "BS Computer Science",
    section: "BSCS-1D",
    hasPriorDelivery: false,
  },
];

export const TEST_STUDENTS = SAMPLE_STUDENTS;

interface CampaignPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: string;
  eventName?: string;
  venue?: string;
  eventDate?: string;
  messageContent?: string;
  bannerImage?: CampaignAssetItem | null;
  bannerImageName?: string;
  attachments?: CampaignAssetItem[];
  studentCount?: number;
  testEmailAddress?: string;
  onTestEmailAddressChange?: (email: string) => void;
  onSubmitCampaign?: () => void;
}

export function CampaignPreviewDialog({
  open,
  onOpenChange,
  subject = "Reminder: UMak SIC General Assembly this Saturday!",
  eventName = "UMak SIC General Assembly",
  venue = "Audio Visual Room",
  eventDate = "Saturday, 17 Oct 2026 at 2:00 PM",
  messageContent,
  bannerImage,
  bannerImageName,
  attachments = [],
  studentCount = 114,
  testEmailAddress = "admin@umak.edu.ph",
  onTestEmailAddressChange,
  onSubmitCampaign,
}: CampaignPreviewDialogProps) {
  const [selectedStudentId, setSelectedStudentId] = React.useState("stu_1");
  const [prevTestEmail, setPrevTestEmail] = React.useState(testEmailAddress);
  const [localTestEmail, setLocalTestEmail] = React.useState(testEmailAddress);

  if (prevTestEmail !== testEmailAddress) {
    setPrevTestEmail(testEmailAddress);
    setLocalTestEmail(testEmailAddress);
  }

  const [isSendingTest, setIsSendingTest] = React.useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = React.useState<string | null>(null);
  const [testErrorMessage, setTestErrorMessage] = React.useState<string | null>(null);

  const student =
    SAMPLE_STUDENTS.find((s) => s.id === selectedStudentId) || SAMPLE_STUDENTS[0];

  const renderedBody = React.useMemo(() => {
    let body =
      messageContent ||
      `Hello {{student_name}},\n\nWe look forward to welcoming you to {{event_name}} on {{event_time}} in the {{venue}}!\n\nPlease have your official QR check-in pass ready on your phone upon entering the room. Check-in opens 2 hours before the session starts.\n\nSee you there!`;

    body = body.replace(/{{student_name}}/g, student.name);
    body = body.replace(/{{student_id}}/g, student.studentId);
    body = body.replace(/{{section}}/g, student.section);
    body = body.replace(/{{event_name}}/g, eventName);
    body = body.replace(/{{event_time}}/g, eventDate);
    body = body.replace(/{{venue}}/g, venue);
    return body;
  }, [messageContent, student, eventName, eventDate, venue]);

  const handleSendTest = async () => {
    if (!localTestEmail || !localTestEmail.includes("@")) {
      setTestErrorMessage("Please enter a valid university email address.");
      setTestSuccessMessage(null);
      return;
    }

    setTestErrorMessage(null);
    setIsSendingTest(true);
    setTestSuccessMessage(null);

    if (onTestEmailAddressChange) {
      onTestEmailAddressChange(localTestEmail);
    }

    try {
      await sendTestEmail({
        to: localTestEmail,
        subject,
        markdown: renderedBody,
      });
      setIsSendingTest(false);
      setTestSuccessMessage(`Practice test sent to ${localTestEmail}.`);
    } catch (error) {
      setIsSendingTest(false);
      setTestErrorMessage(error instanceof Error ? error.message : "We could not send the practice email. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-line rounded-[16px] p-0 overflow-hidden shadow-2xl font-sans">
        {/* Minimalist Header */}
        <div className="p-6 pr-12 border-b border-line-subtle bg-paper flex items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-display font-extrabold text-ink tracking-tight">
              Ticket Pass Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-muted mt-0.5 font-sans">
              Inspect how dynamic student names and QR check-in passes render.
            </DialogDescription>
          </div>
        </div>

        {/* Minimalist Controls Bar */}
        <div className="px-6 py-4 bg-canvas/30 border-b border-line-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Student Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted font-medium shrink-0">Student:</span>
            <Select
              value={selectedStudentId}
              onValueChange={(val) => {
                setSelectedStudentId(val);
                setTestSuccessMessage(null);
              }}
            >
              <SelectTrigger className="h-8.5 text-xs bg-card border-line rounded-[6px] font-medium text-ink w-56">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent className="bg-card border-line rounded-[8px]">
                {SAMPLE_STUDENTS.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    <span className="font-semibold text-ink">{s.name}</span>
                    <span className="text-muted ml-1.5 font-mono text-[11px]">
                      ({s.studentId})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Practice Test Send */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              value={localTestEmail}
              onChange={(e) => {
                setLocalTestEmail(e.target.value);
                setTestSuccessMessage(null);
                setTestErrorMessage(null);
              }}
              placeholder="admin@umak.edu.ph"
              className="h-8.5 text-xs bg-card rounded-[6px] border-line font-medium text-ink w-full sm:w-48"
            />
            <Button
              type="button"
              onClick={handleSendTest}
              disabled={isSendingTest}
              className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-8.5 px-3 gap-1.5 cursor-pointer shrink-0"
            >
              <PaperPlaneTilt size={13} weight="bold" />
              <span>{isSendingTest ? "Sending..." : "Test"}</span>
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {testSuccessMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-soft border border-green-border rounded-[8px] text-xs text-green flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle size={15} className="text-green shrink-0" weight="bold" />
            <span>{testSuccessMessage}</span>
          </div>
        )}

        {testErrorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-soft border border-red-border rounded-[8px] text-xs text-red flex items-center gap-2 animate-in fade-in duration-150">
            <WarningCircle size={15} className="text-red shrink-0" weight="bold" />
            <span>{testErrorMessage}</span>
          </div>
        )}

        {/* Rendered Pass Card */}
        <div className="p-6 max-h-[55vh] overflow-y-auto bg-canvas/20 flex flex-col items-center">
          <div className="w-full bg-card border border-line rounded-[14px] overflow-hidden shadow-xs">
            {/* Minimalist Top Banner */}
            <div className="p-5 bg-ink text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-cyan-soft font-bold font-display block">
                  UMak Student Innovation Community
                </span>
                <h4 className="text-base font-display font-bold mt-0.5 text-white">
                  {eventName}
                </h4>
              </div>
              <span className="text-xs text-cyan-soft font-mono font-medium">
                {eventDate.split("at")[0] || "17 Oct 2026"}
              </span>
            </div>

            {/* Email Message Content */}
            <div className="p-5 flex flex-col gap-4 text-xs text-ink leading-relaxed">
              <div>
                <strong className="text-ink font-bold text-sm font-display block">
                  {subject}
                </strong>
                <span className="text-[11px] text-muted">To: {student.name} ({student.email})</span>
              </div>

              <div className="whitespace-pre-line text-ink/90 font-sans text-xs leading-relaxed border-t border-line-subtle pt-3">
                {renderedBody}
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="pt-2 border-t border-line-subtle flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-canvas border border-line text-[11px] font-medium text-ink"
                    >
                      <FilePdf size={14} className="text-red" weight="fill" />
                      <span>{att.fileName}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Scannable Physical QR Ticket Pass */}
              <div
                className="mt-2 p-4 bg-paper rounded-[12px] border border-cyan-border shadow-xs flex items-center gap-4"
                aria-label="Recipient-specific QR ticket"
              >
                <div className="w-20 h-20 bg-card p-1.5 rounded-[8px] border border-line shrink-0 flex items-center justify-center">
                  <QrCode size={70} className="text-ink" weight="regular" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-cyan font-display">
                    Official Check-in Pass
                  </span>
                  <div className="font-display font-bold text-sm text-ink truncate">
                    {student.name}
                  </div>
                  <div className="font-mono text-[11px] text-muted">
                    ID: {student.studentId}
                  </div>
                  <div className="text-[10.5px] text-muted font-sans mt-0.5">
                    Present at {venue} upon entry.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line-subtle bg-paper flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted font-sans">
            <ShieldCheck size={15} className="text-green shrink-0" weight="bold" />
            <span>Ready for {studentCount} registered students</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold rounded-[6px] h-8.5 px-3.5 cursor-pointer"
            >
              Done
            </Button>
            {onSubmitCampaign && (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onSubmitCampaign();
                }}
                className="bg-cyan hover:bg-cyan-hover text-white text-xs font-semibold rounded-[6px] h-8.5 px-4 gap-1.5 cursor-pointer shadow-xs"
              >
                <PaperPlaneTilt size={14} weight="bold" />
                <span>Send to All</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const CampaignTestSendDialog = CampaignPreviewDialog;
