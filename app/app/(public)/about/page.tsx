import type { Metadata } from "next";
import { BookOpenText } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/public/page-parts";
import { getSiteContent } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "About" };

// Mission, Vision and History (PS-03.3).
export default async function AboutPage() {
  const site = await getSiteContent();
  const parts = [
    { id: "mission", title: "Mission", text: site.mission },
    { id: "vision", title: "Vision", text: site.vision },
    { id: "history", title: "History", text: site.history },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {parts.map(({ id, title, text }) => (
        <section
          key={id}
          aria-labelledby={id}
          className={cn(
            "flex flex-col gap-3 rounded-[16px] border border-line bg-paper p-6",
            id === "history" && "lg:col-span-2",
          )}
        >
          <h2 id={id} className="font-display text-xl font-bold tracking-tight">
            {title}
          </h2>
          {text ? (
            <p className="max-w-[70ch] whitespace-pre-line text-base leading-relaxed text-ink">{text}</p>
          ) : (
            <EmptyState icon={BookOpenText} message={`Our ${title.toLowerCase()} will be posted soon.`} />
          )}
        </section>
      ))}
    </div>
  );
}
