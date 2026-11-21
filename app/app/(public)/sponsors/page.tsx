import type { Metadata } from "next";
import Image from "next/image";
import { ArrowSquareOut, Handshake } from "@phosphor-icons/react/dist/ssr";

import { EmptyState, focusRing, PageBody, PageHeader } from "@/components/public/page-parts";
import { listSponsors, type Sponsor } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sponsors and Partners" };

function SponsorTile({ sponsor }: { sponsor: Sponsor }) {
  const body = (
    <>
      <div className="relative flex h-24 w-full items-center justify-center">
        {sponsor.logoUrl ? (
          <Image src={sponsor.logoUrl} alt={sponsor.name} fill unoptimized sizes="(min-width: 1024px) 20vw, 45vw" className="object-contain" />
        ) : (
          <span className="font-display text-lg font-bold text-ink">{sponsor.name}</span>
        )}
      </div>
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
        {sponsor.name}
        {sponsor.linkUrl ? <ArrowSquareOut size={16} aria-hidden="true" className="text-cyan" /> : null}
      </p>
    </>
  );
  const tile = "flex h-full flex-col items-center gap-4 rounded-[16px] border border-line bg-paper p-6 text-center";

  // A sponsor links out only when a link is given, in a new tab (PS-08.2).
  return sponsor.linkUrl ? (
    <a
      href={sponsor.linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(tile, "transition-colors hover:border-cyan-border", focusRing)}
    >
      {body}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  ) : (
    <div className={tile}>{body}</div>
  );
}

// Each sponsor's name and logo, with alt text (PS-08).
export default async function SponsorsPage() {
  const sponsors = await listSponsors();
  return (
    <PageBody>
      <PageHeader title="Sponsors and Partners" intro="The organizations that make SIC events possible." />
      {sponsors.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {sponsors.map((sponsor) => (
            <li key={sponsor.id}>
              <SponsorTile sponsor={sponsor} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Handshake} message="Our sponsors and partners will be listed here soon." />
      )}
    </PageBody>
  );
}
