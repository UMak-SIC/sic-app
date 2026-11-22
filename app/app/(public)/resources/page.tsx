import type { Metadata } from "next";
import { DownloadSimple, FileText, Warning } from "@phosphor-icons/react/dist/ssr";
import type { ResourceType } from "@prisma/client";

import { EmptyState, focusRing, PageBody, PageHeader, SectionTitle } from "@/components/public/page-parts";
import { listResourcesByType } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resources" };

const GROUPS: Record<ResourceType, { id: string; title: string }> = {
  FORM: { id: "forms", title: "Forms" },
  BYLAW: { id: "bylaws", title: "By-laws" },
  REPORT: { id: "reports", title: "Reports" },
};

// Forms, by-laws and reports, each with its file name, type and a download link
// (PS-09). A file that cannot be downloaded says so instead of a broken link.
export default async function ResourcesPage() {
  const groups = await listResourcesByType();

  return (
    <PageBody className="gap-12">
      <PageHeader title="Resources" intro="Forms and documents from the Society of Innovative Computing." />
      {groups.map(({ type, files }) => (
        <section key={type} aria-labelledby={GROUPS[type].id} className="flex flex-col gap-4">
          <SectionTitle id={GROUPS[type].id}>{GROUPS[type].title}</SectionTitle>
          {files.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {files.map((file) => (
                <li key={file.id} className="flex items-center gap-4 rounded-[16px] border border-line bg-paper p-4">
                  <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-cyan-soft text-cyan">
                    <FileText size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{file.title}</p>
                    <p className="truncate text-xs text-muted">
                      {file.fileName} ({file.fileType})
                    </p>
                  </div>
                  {file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-cyan-border hover:bg-cyan-muted",
                        focusRing,
                      )}
                    >
                      <DownloadSimple size={16} aria-hidden="true" />
                      Download<span className="sr-only"> {file.title}</span>
                    </a>
                  ) : (
                    <p className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber">
                      <Warning size={16} aria-hidden="true" />
                      Not available right now
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileText} message={`No ${GROUPS[type].title.toLowerCase()} have been posted yet.`} />
          )}
        </section>
      ))}
    </PageBody>
  );
}
