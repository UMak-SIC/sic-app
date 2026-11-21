import type { Metadata } from "next";
import Image from "next/image";
import { Chalkboard } from "@phosphor-icons/react/dist/ssr";

import { EmptyState, initials } from "@/components/public/page-parts";
import { getSiteContent } from "@/lib/public-site/content";

export const metadata: Metadata = { title: "Adviser" };

// The adviser's name, title and photo (PS-03.4).
export default async function AdviserPage() {
  const { adviser } = await getSiteContent();
  if (!adviser) {
    return <EmptyState icon={Chalkboard} message="Our adviser's details will be posted soon." />;
  }

  return (
    <section className="flex flex-col items-start gap-6 rounded-[16px] border border-line bg-paper p-6 sm:flex-row sm:items-center sm:p-8">
      <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-[16px] bg-cyan-soft">
        {adviser.photoUrl ? (
          <Image
            src={adviser.photoUrl}
            alt={`Photo of ${adviser.name}, SIC adviser`}
            fill
            unoptimized
            sizes="160px"
            className="object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label={`No photo for ${adviser.name}`}
            className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-cyan"
          >
            {initials(adviser.name)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold tracking-tight">{adviser.name}</h2>
        {adviser.title ? <p className="text-base text-muted">{adviser.title}</p> : null}
      </div>
    </section>
  );
}
