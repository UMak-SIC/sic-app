"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { CampaignWizardStepper, WizardStep } from "@/components/campaign/campaign-wizard-stepper";
import { CampaignRecipientsStep } from "@/components/campaign/campaign-recipients-step";
import { CampaignComposerStep } from "@/components/campaign/campaign-composer-step";
import { CampaignAssetsStep } from "@/components/campaign/campaign-assets-step";
import { CampaignPreviewDialog } from "@/components/campaign/campaign-preview-dialog";
import { CampaignSendConfirmationDialog } from "@/components/campaign/campaign-send-confirmation-dialog";
import { CampaignDraftState } from "@/components/campaign/campaign-types";

const EVENT_STUDENT_COUNTS: Record<string, number> = {
  evt_1: 114,
  evt_2: 48,
  evt_3: 70,
  evt_4: 0,
};

const INITIAL_DRAFT: CampaignDraftState = {
  eventId: "evt_1",
  eventName: "UMak SIC General Assembly",
  includeOfficers: true,
  subject: "Reminder: UMak SIC General Assembly this Saturday!",
  messageContent: `Hello {{student_name}},

We look forward to welcoming you to {{event_name}} on {{event_time}} in the {{venue}}!

Please have your official QR check-in pass ready on your phone or printed out upon entering the room. Check-in opens 2 hours before the session starts.

See you there!`,
  bannerImage: {
    id: "ast_1",
    fileName: "general-assembly-banner.jpg",
    fileSize: "1.8 MB",
    fileType: "image",
    role: "banner",
  },
  attachments: [
    {
      id: "ast_2",
      fileName: "event-program-and-guidelines.pdf",
      fileSize: "420 KB",
      fileType: "document",
      role: "attachment",
    },
  ],
  testEmailAddress: "admin@umak.edu.ph",
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState<WizardStep>(1);
  const [maxAccessibleStep, setMaxAccessibleStep] = React.useState<number>(1);
  const [isTestModalOpen, setIsTestModalOpen] = React.useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<CampaignDraftState>(INITIAL_DRAFT);

  const studentCount = EVENT_STUDENT_COUNTS[draft.eventId] ?? 114;

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
    if (step > maxAccessibleStep) {
      setMaxAccessibleStep(step);
    }
  };

  const handleSaveDraft = () => {
    router.push("/campaign");
  };

  const handleBroadcastConfirmed = () => {
    router.push("/campaign");
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-14 font-sans">
      {/* Top Header with return navigation */}
      <PageHeader
        title={<span className="font-display font-bold text-ink">New Email Announcement</span>}
        description="Send personalized event reminders and QR ticket passes to registered students."
        action={
          <PageHeaderButton
            variant="outline"
            icon={<ArrowLeft size={16} weight="bold" />}
            onClick={() => router.push("/campaign")}
          >
            All Announcements
          </PageHeaderButton>
        }
      />

      {/* 3-Step Guided Stepper */}
      <CampaignWizardStepper
        currentStep={currentStep}
        maxAccessibleStep={maxAccessibleStep}
        onStepClick={(step) => goToStep(step)}
      />

      {/* Step 1: Choose Event & Students */}
      {currentStep === 1 && (
        <CampaignRecipientsStep
          eventId={draft.eventId}
          eventName={draft.eventName}
          onEventChange={(id, name) =>
            setDraft((d) => ({
              ...d,
              eventId: id,
              eventName: name,
              subject: `Reminder: ${name} this Saturday!`,
            }))
          }
          onContinue={() => goToStep(2)}
          onSaveDraft={handleSaveDraft}
        />
      )}

      {/* Step 2: Write Message */}
      {currentStep === 2 && (
        <CampaignComposerStep
          eventId={draft.eventId}
          eventName={draft.eventName}
          subject={draft.subject}
          messageContent={draft.messageContent}
          includeOfficers={draft.includeOfficers}
          studentCount={studentCount}
          onSubjectChange={(subj) => setDraft((d) => ({ ...d, subject: subj }))}
          onMessageContentChange={(msg) => setDraft((d) => ({ ...d, messageContent: msg }))}
          onIncludeOfficersChange={(inc) => setDraft((d) => ({ ...d, includeOfficers: inc }))}
          onBack={() => goToStep(1)}
          onContinue={() => goToStep(3)}
          onSaveDraft={handleSaveDraft}
        />
      )}

      {/* Step 3: Add Banner, Files & Send */}
      {currentStep === 3 && (
        <CampaignAssetsStep
          subject={draft.subject}
          messageContent={draft.messageContent}
          bannerImage={draft.bannerImage}
          attachments={draft.attachments}
          testEmailAddress={draft.testEmailAddress}
          studentCount={studentCount}
          onBannerImageChange={(img) => setDraft((d) => ({ ...d, bannerImage: img }))}
          onAttachmentsChange={(atts) => setDraft((d) => ({ ...d, attachments: atts }))}
          onTestEmailAddressChange={(email) => setDraft((d) => ({ ...d, testEmailAddress: email }))}
          onBack={() => goToStep(2)}
          onOpenTestSend={() => setIsTestModalOpen(true)}
          onSubmitFinal={() => setIsConfirmModalOpen(true)}
          onSaveDraft={handleSaveDraft}
        />
      )}

      {/* Dedicated Practice Test Send Dialog (Screen 20) */}
      <CampaignPreviewDialog
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        subject={draft.subject}
        eventName={draft.eventName}
        messageContent={draft.messageContent}
        bannerImage={draft.bannerImage}
        attachments={draft.attachments}
        studentCount={studentCount}
        testEmailAddress={draft.testEmailAddress}
        onTestEmailAddressChange={(email) => setDraft((d) => ({ ...d, testEmailAddress: email }))}
      />


      {/* Pre-Send Confirmation & Checklist Dialog */}
      <CampaignSendConfirmationDialog
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        eventName={draft.eventName}
        subject={draft.subject}
        studentCount={studentCount}
        onConfirmSend={handleBroadcastConfirmed}
      />
    </div>
  );
}
