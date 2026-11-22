import type { Metadata } from "next";
import { UsersFour } from "@phosphor-icons/react/dist/ssr";

import { PeopleGrid } from "@/components/public/content-parts";
import { EmptyState } from "@/components/public/page-parts";
import { listCommittees } from "@/lib/public-site/content";

export const metadata: Metadata = { title: "Committees" };

// Every committee with its description and members, in dashboard order (PS-11).
export default async function CommitteesPage() {
  const committees = await listCommittees();
  if (committees.length === 0) {
    return <EmptyState icon={UsersFour} message="Our committees will be listed soon." />;
  }

  return (
    <div className="flex flex-col gap-10">
      {committees.map((committee) => (
        <section
          key={committee.id}
          aria-labelledby={`committee-${committee.id}`}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <h2 id={`committee-${committee.id}`} className="font-display text-xl font-bold tracking-tight">
              {committee.name}
            </h2>
            {committee.description ? (
              <p className="max-w-[70ch] text-sm leading-relaxed text-muted">{committee.description}</p>
            ) : null}
          </div>
          {committee.members.length > 0 ? (
            <PeopleGrid people={committee.members} />
          ) : (
            <p className="rounded-[12px] border border-dashed border-line bg-paper px-4 py-3 text-sm text-muted">
              Members to be announced.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
