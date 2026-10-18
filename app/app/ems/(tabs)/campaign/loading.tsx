import * as React from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { CampaignCatalogSkeleton } from "@/components/campaign/campaign-catalog-skeleton";

export default function CampaignLoading() {
  return (
    <div className="flex flex-col gap-6 w-full pb-14 font-sans">
      <PageHeader
        title={<span className="font-display font-bold text-ink">Announcements & Emails</span>}
        description="Send personalized event updates and official QR ticket check-in passes to students."
      />
      <CampaignCatalogSkeleton />
    </div>
  );
}
