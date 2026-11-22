import type { Metadata } from "next";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { EmptyState, PageBody, PageHeader } from "@/components/public/page-parts";
import { getSiteContent } from "@/lib/public-site/content";
import { formatShortDate } from "@/lib/public-site/format";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";

export const metadata: Metadata = { title: "Privacy Notice" };

// The Privacy Notice and the date it was last updated (PS-15). Its text is edited
// in the dashboard (SY-08) and must be reviewed by the UMak Data Protection
// Officer before go-live (PS-15.5).
export default async function PrivacyPage() {
  const site = await getSiteContent();

  return (
    <PageBody className="max-w-3xl">
      <div className="flex flex-col gap-2">
        <PageHeader title="Privacy Notice" />
        {site.privacyNoticeUpdatedAt ? (
          <p className="text-sm text-muted">
            Last updated {formatShortDate(site.privacyNoticeUpdatedAt, getOrganizationTimezone())}
          </p>
        ) : null}
      </div>
      {site.privacyNoticeHtml ? (
        <div className="public-prose text-base" dangerouslySetInnerHTML={{ __html: site.privacyNoticeHtml }} />
      ) : (
        <EmptyState icon={ShieldCheck} message="Our Privacy Notice is being prepared and will be posted here." />
      )}
    </PageBody>
  );
}
