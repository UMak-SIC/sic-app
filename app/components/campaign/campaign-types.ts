export type CampaignStatus = "draft" | "sending" | "sent" | "needs_attention" | "no_campaigns";

export interface StudentRecipient {
  id: string;
  name: string;
  studentId: string;
  email: string;
  deliveryStatus: "delivered" | "sending" | "invalid_email" | "already_received" | "pending";
  deliveredAt?: string;
  scheduledAt?: string;
  isSending?: boolean;
  statusNote?: string;
  college?: string;
  course?: "BSIT" | "BSCS" | "BSINS" | string;
  program?: string;
  section?: string;
  provider?: "Brevo";
  messageId?: string;
  ticketCode?: string;
}

export interface CampaignAssetItem {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: "image" | "document";
  role: "banner" | "attachment";
  url?: string;
}

export interface DeliveryQueueBreakdown {
  queued: number;
  sending: number;
  sent: number;
  bounced: number;
  failed: number;
}

export interface DeliveryDiagnosticItem {
  id: string;
  recipientName: string;
  studentId: string;
  email: string;
  provider: "Brevo";
  messageId?: string;
  scheduledRetry?: string;
  status: "sent" | "queued" | "bounced" | "failed";
  statusDescription: string;
  idempotencyKey: string;
  lastAttemptTime: string;
}

export interface CampaignBroadcastHistoryItem {
  id: string;
  subject: string;
  createdAt: string;
  deliveredCount: number;
}

export interface CampaignSummary {
  id: string;
  eventId?: string;
  subject: string;
  eventName: string;
  venue?: string;
  eventDate?: string;
  sentDate: string;
  status: CampaignStatus;
  totalStudents: number;
  deliveredCount: number;
  sendingCount: number;
  invalidEmailCount: number;
  pendingCount?: number;
  campaignsCount?: number;
  broadcasts?: CampaignBroadcastHistoryItem[];
  bannerImageName?: string;
  attachedFilesCount: number;
  recipients: StudentRecipient[];
  queueBreakdown?: DeliveryQueueBreakdown;
  diagnostics?: DeliveryDiagnosticItem[];
}

export interface CampaignDraftState {
  id?: string;
  eventId: string;
  eventName: string;
  includeOfficers: boolean;
  subject: string;
  messageContent: string;
  bannerImage: CampaignAssetItem | null;
  attachments: CampaignAssetItem[];
  testEmailAddress: string;
}
