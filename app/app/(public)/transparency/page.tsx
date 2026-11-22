import type { Metadata } from "next";
import { Scales } from "@phosphor-icons/react/dist/ssr";

import { EmptyState, PageBody, PageHeader } from "@/components/public/page-parts";

export const metadata: Metadata = { title: "Transparency of Funds" };

// Transparency of Funds (PS-12). The page and its header and footer links are in
// place; the reports themselves wait for the Executive Committee's decision on
// what to publish (D-02), so until then no report exists and the page shows the
// required plain message (PS-12.7).
export default function TransparencyPage() {
  return (
    <PageBody>
      <PageHeader
        title="Transparency of Funds"
        intro="Budget allocations, financial reports and liquidation reports, once the Executive Committee publishes them."
      />
      <EmptyState icon={Scales} message="No financial reports have been published yet." />
    </PageBody>
  );
}
