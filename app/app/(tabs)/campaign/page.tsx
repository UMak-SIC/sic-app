import { Megaphone } from "lucide-react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";

export const metadata = {
  title: "Campaign — UMak SIC",
};

export default function CampaignPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title={<span className="font-bold">Campaign</span>}
        description="Outreach channels, newsletters, and announcements."
        action={
          <PageHeaderButton icon={<Megaphone className="h-4 w-4 stroke-[2.2]" />}>
            New Campaign
          </PageHeaderButton>
        }
      />
    </div>
  );
}

