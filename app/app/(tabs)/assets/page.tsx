import { Upload } from "lucide-react";
import { PageHeader, PageHeaderButton } from "@/components/dashboard/page-header";

export const metadata = {
  title: "Assets — UMak SIC",
};

export default function AssetsPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title={<span className="font-bold">Assets</span>}
        description="Brand guidelines, media files, and event assets."
        action={
          <PageHeaderButton icon={<Upload className="h-4 w-4 stroke-[2.2]" />}>
            Upload Asset
          </PageHeaderButton>
        }
      />
    </div>
  );
}

