import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CampaignCatalogSkeleton } from "@/components/campaign/campaign-catalog-skeleton";
import { CampaignDetailSkeleton } from "@/components/campaign/campaign-detail-skeleton";
import { CampaignWizardSkeleton } from "@/components/campaign/campaign-wizard-skeleton";
import CampaignLoading from "@/app/(tabs)/campaign/loading";
import CampaignDetailLoading from "@/app/(tabs)/campaign/[id]/loading";
import NewCampaignLoading from "@/app/(tabs)/campaign/new/loading";

describe("Campaign Skeleton Components", () => {
  it("renders CampaignCatalogSkeleton with accessible attributes", () => {
    const el = CampaignCatalogSkeleton({ cardCount: 6 });
    expect(isValidElement(el)).toBe(true);
    expect(el.props["aria-busy"]).toBe("true");
    expect(el.props["aria-label"]).toBe("Loading announcements and campaigns");
  });

  it("renders CampaignDetailSkeleton with accessible attributes", () => {
    const el = CampaignDetailSkeleton({ rowCount: 6 });
    expect(isValidElement(el)).toBe(true);
    expect(el.props["aria-busy"]).toBe("true");
    expect(el.props["aria-label"]).toBe("Loading campaign delivery details");
  });

  it("renders CampaignWizardSkeleton with accessible attributes", () => {
    const el = CampaignWizardSkeleton();
    expect(isValidElement(el)).toBe(true);
    expect(el.props["aria-busy"]).toBe("true");
    expect(el.props["aria-label"]).toBe("Loading campaign wizard");
  });

  it("renders route streaming boundary for /campaign", () => {
    const el = CampaignLoading();
    expect(isValidElement(el)).toBe(true);
  });

  it("renders route streaming boundary for /campaign/[id]", () => {
    const el = CampaignDetailLoading();
    expect(isValidElement(el)).toBe(true);
  });

  it("renders route streaming boundary for /campaign/new", () => {
    const el = NewCampaignLoading();
    expect(isValidElement(el)).toBe(true);
  });
});
