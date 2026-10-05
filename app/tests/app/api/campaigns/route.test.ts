import { afterEach, expect, test, vi } from "vitest";

const { requireAdmin, listCampaigns, submitCampaign, getCampaignDetail, retryFailedDeliveries } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listCampaigns: vi.fn(),
  submitCampaign: vi.fn(),
  getCampaignDetail: vi.fn(),
  retryFailedDeliveries: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/services/campaign-service", () => ({
  CampaignError: class CampaignError extends Error {},
  listCampaigns,
  submitCampaign,
  getCampaignDetail,
  retryFailedDeliveries,
}));

import { GET as list, POST as submit } from "@/app/api/campaigns/route";
import { GET as detail } from "@/app/api/campaigns/[id]/route";
import { POST as retry } from "@/app/api/campaigns/[id]/deliveries/retry/route";

afterEach(() => vi.resetAllMocks());

test("lists persisted campaigns for an administrator", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  listCampaigns.mockResolvedValue([{ id: "campaign-id" }]);

  const response = await list();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ campaigns: [{ id: "campaign-id" }] });
});

test("submits a campaign with the signed-in administrator as creator", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  submitCampaign.mockResolvedValue({ campaignId: "campaign-id", queuedCount: 2 });

  const response = await submit(new Request("https://sic.test/api/campaigns", {
    method: "POST",
    body: JSON.stringify({
      eventId: "00000000-0000-4000-8000-000000000001",
      idempotencyKey: "request-idempotency-key",
      attendeeIds: ["00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"],
      subject: "General assembly reminder",
      markdown: "Hello {{student_name}}",
      assets: [{ assetId: "00000000-0000-4000-8000-000000000004", role: "ATTACHMENT" }],
    }),
  }));

  expect(submitCampaign).toHaveBeenCalledWith({
    eventId: "00000000-0000-4000-8000-000000000001",
    idempotencyKey: "request-idempotency-key",
    attendeeIds: ["00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"],
    subject: "General assembly reminder",
    markdown: "Hello {{student_name}}",
    assets: [{ assetId: "00000000-0000-4000-8000-000000000004", role: "ATTACHMENT" }],
    createdById: "admin-id",
  });
  expect(response.status).toBe(201);
});

test("rejects an incomplete campaign before it reaches the service", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });

  const response = await submit(new Request("https://sic.test/api/campaigns", {
    method: "POST",
    body: JSON.stringify({ eventId: "00000000-0000-4000-8000-000000000001" }),
  }));

  expect(response.status).toBe(400);
  expect(submitCampaign).not.toHaveBeenCalled();
});

test("returns a campaign detail snapshot or a plain-language not-found response", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  getCampaignDetail.mockResolvedValue(null);

  const response = await detail(new Request("https://sic.test/api/campaigns/campaign-id"), {
    params: Promise.resolve({ id: "campaign-id" }),
  });

  expect(getCampaignDetail).toHaveBeenCalledWith("campaign-id");
  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "Email campaign not found." });
});

test("retries only the delivery ids supplied for this campaign", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });
  retryFailedDeliveries.mockResolvedValue({ queuedCount: 1, skippedCount: 0 });

  const response = await retry(new Request("https://sic.test/api/campaigns/campaign-id/deliveries/retry", {
    method: "POST",
    body: JSON.stringify({ deliveryIds: ["00000000-0000-4000-8000-000000000005"] }),
  }), { params: Promise.resolve({ id: "campaign-id" }) });

  expect(retryFailedDeliveries).toHaveBeenCalledWith({ campaignId: "campaign-id", deliveryIds: ["00000000-0000-4000-8000-000000000005"] });
  await expect(response.json()).resolves.toEqual({ queuedCount: 1, skippedCount: 0 });
});

test("rejects a retry request without delivery ids", async () => {
  requireAdmin.mockResolvedValue({ adminId: "admin-id" });

  const response = await retry(new Request("https://sic.test/api/campaigns/campaign-id/deliveries/retry", {
    method: "POST",
    body: JSON.stringify({}),
  }), { params: Promise.resolve({ id: "campaign-id" }) });

  expect(response.status).toBe(400);
  expect(retryFailedDeliveries).not.toHaveBeenCalled();
});
