"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";
import { CampaignWizardStepper, WizardStep } from "@/components/campaign/campaign-wizard-stepper";
import { CampaignRecipientsStep, type EventOption } from "@/components/campaign/campaign-recipients-step";
import { CampaignComposerStep } from "@/components/campaign/campaign-composer-step";
import { CampaignAssetsStep } from "@/components/campaign/campaign-assets-step";
import { CampaignSendConfirmationDialog } from "@/components/campaign/campaign-send-confirmation-dialog";
import { CampaignDraftState, type StudentRecipient } from "@/components/campaign/campaign-types";

const INITIAL_DRAFT: CampaignDraftState = {
  eventId: "",
  eventName: "",
  includeOfficers: true,
  subject: "",
  messageContent: "Hello {{student_name}},\n\nWe look forward to welcoming you to {{event_name}} on {{event_time}}.\n\nSee you there!",
  bannerImage: null,
  attachments: [],
  testEmailAddress: "",
};

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = React.useState<WizardStep>(1);
  const [maxAccessibleStep, setMaxAccessibleStep] = React.useState<number>(1);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<CampaignDraftState>(INITIAL_DRAFT);
  const [eventOptions, setEventOptions] = React.useState<EventOption[]>([]);
  const [eventsLoaded, setEventsLoaded] = React.useState(false);
  const [organizerCount, setOrganizerCount] = React.useState(0);
  const [rosterRecipients, setRosterRecipients] = React.useState<StudentRecipient[]>([]);
  const [organizerRecipients, setOrganizerRecipients] = React.useState<StudentRecipient[]>([]);
  const [selectedRosterRecipientIds, setSelectedRosterRecipientIds] = React.useState<string[]>([]);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const requestedEventId = searchParams.get("eventId");

  React.useEffect(() => {
    let active = true;
    fetch("/api/events")
      .then(async (response) => {
        const payload = await response.json() as { events?: Array<{ id: string; name: string; venue: string | null; startsAt: string; endsAt: string; status: "DRAFT" | "PUBLISHED" | "CLOSED" }>; error?: string };
        if (!response.ok) throw new Error(payload.error);
        return payload.events ?? [];
      })
      .then((events) => {
        if (!active) return;
        const options = events.filter((event) => event.status === "PUBLISHED").map((event) => ({
          id: event.id,
          title: event.name,
          venue: event.venue ?? "Venue to be confirmed",
          date: new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date(event.startsAt)),
          time: new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(new Date(event.startsAt)),
          status: event.status.toLowerCase() as EventOption["status"],
          registeredCount: 0,
          willReceiveCount: 0,
          alreadyReceivedCount: 0,
          capacity: 0,
        }));
        setEventOptions(options);
        const selectedId = requestedEventId ?? options.find((event) => event.status === "published")?.id;
        if (selectedId) setDraft((current) => current.eventId ? current : { ...current, eventId: selectedId });
      })
      .catch(() => active && setSubmitError("We could not load events. Refresh the page and try again."))
      .finally(() => active && setEventsLoaded(true));
    return () => { active = false; };
  }, [requestedEventId]);

  React.useEffect(() => {
    const eventId = requestedEventId ?? draft.eventId;
    if (!eventId) return;

    Promise.all([
      fetch(`/api/events/${eventId}`),
      fetch(`/api/events/${eventId}/people`),
    ])
      .then(async ([eventResponse, organizersResponse]) => {
        if (!eventResponse.ok || !organizersResponse.ok) throw new Error();
        return Promise.all([eventResponse.json(), organizersResponse.json()]);
      })
      .then(([data, people]) => {
        const event = data.event as { id: string; name: string; venue: string | null; startsAt: string; endsAt: string };
        const recipients = people.attendees.map((person: { id: string; name: string; studentId: string; email: string; course: string | null; program: string | null; section: string | null }) => ({ ...person, section: person.section ?? undefined, deliveryStatus: "sending" as const }));
        const organizers = people.organizers.map((person: { id: string; name: string; studentId: string; email: string; course: string | null; program: string | null; section: string | null }) => ({ ...person, section: person.section ?? undefined, deliveryStatus: "sending" as const }));
        setRosterRecipients(recipients);
        setOrganizerRecipients(organizers);
        setOrganizerCount(people.organizers.length);
        setDraft((current) => ({ ...current, eventId: event.id, eventName: event.name, subject: `Reminder: ${event.name}` }));
      })
      .catch(() => setSubmitError("We could not load the selected event. Choose another event and try again."));
  }, [draft.eventId, requestedEventId]);

  const rosterCount = selectedRosterRecipientIds.length;
  const recipientCount = rosterCount + (draft.includeOfficers ? organizerCount : 0);

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
    if (step > maxAccessibleStep) {
      setMaxAccessibleStep(step);
    }
  };

  const handleBroadcastConfirmed = async () => {
    setSubmitError(null);
    const recipients = [
      ...rosterRecipients.filter((recipient) => selectedRosterRecipientIds.includes(recipient.id)),
      ...(draft.includeOfficers ? organizerRecipients : []),
    ];
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: draft.eventId,
        attendeeIds: [...new Set(recipients.map((recipient) => recipient.id))],
        subject: draft.subject,
        markdown: draft.messageContent,
        assets: [
          ...(draft.bannerImage ? [{ assetId: draft.bannerImage.id, role: "INLINE" }] : []),
          ...draft.attachments.map((asset) => ({ assetId: asset.id, role: "ATTACHMENT" })),
        ],
      }),
    });
    const result = await response.json() as { campaignId?: string; error?: string };
    if (!response.ok || !result.campaignId) {
      setSubmitError(result.error ?? "We could not send this email. Please try again.");
      throw new Error(result.error);
    }
    router.push(`/campaign/${result.campaignId}`);
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
      {currentStep === 1 && !eventsLoaded && (
        <div className="rounded-[12px] border border-line bg-card p-6 text-sm text-muted font-sans">Loading published events...</div>
      )}
      {currentStep === 1 && eventsLoaded && eventOptions.length === 0 && (
        <div className="rounded-[12px] border border-line bg-card p-6 text-sm text-muted font-sans">No published events are ready for an email campaign.</div>
      )}
      {currentStep === 1 && eventsLoaded && eventOptions.length > 0 && (
        <CampaignRecipientsStep
          key={draft.eventId}
          eventId={draft.eventId}
          eventName={draft.eventName}
          eventOptions={eventOptions}
          recipients={rosterRecipients}
           onEventChange={(id, name) =>
             setDraft((d) => ({
              ...d,
              eventId: id,
              eventName: name,
               subject: `Reminder: ${name} this Saturday!`,
             }))
           }
           onContinue={(recipientIds) => {
             setSelectedRosterRecipientIds(recipientIds);
             goToStep(2);
           }}
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
          organizerCount={organizerCount}
          studentCount={recipientCount}
          onSubjectChange={(subj) => setDraft((d) => ({ ...d, subject: subj }))}
          onMessageContentChange={(msg) => setDraft((d) => ({ ...d, messageContent: msg }))}
          onIncludeOfficersChange={(inc) => setDraft((d) => ({ ...d, includeOfficers: inc }))}
          onBack={() => goToStep(1)}
          onContinue={() => goToStep(3)}
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
          studentCount={recipientCount}
          practiceRecipients={rosterRecipients.filter((recipient) => selectedRosterRecipientIds.includes(recipient.id))}
          onBannerImageChange={(img) => setDraft((d) => ({ ...d, bannerImage: img }))}
          onAttachmentsChange={(atts) => setDraft((d) => ({ ...d, attachments: atts }))}
          onTestEmailAddressChange={(email) => setDraft((d) => ({ ...d, testEmailAddress: email }))}
          onBack={() => goToStep(2)}
          onSubmitFinal={() => setIsConfirmModalOpen(true)}
        />
      )}


      {/* Pre-Send Confirmation & Checklist Dialog */}
      <CampaignSendConfirmationDialog
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        eventName={draft.eventName}
        subject={draft.subject}
        studentCount={recipientCount}
          onConfirmSend={handleBroadcastConfirmed}
        />
        {submitError && <p role="alert" className="text-sm text-red font-sans">{submitError}</p>}
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <React.Suspense fallback={<div className="rounded-[12px] border border-line bg-card p-6 text-sm text-muted">Loading email composer...</div>}>
      <NewCampaignContent />
    </React.Suspense>
  );
}
