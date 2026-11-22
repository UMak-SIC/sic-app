import type { Metadata } from "next";
import { AddressBook, ArrowSquareOut, EnvelopeSimple, MapPin } from "@phosphor-icons/react/dist/ssr";

import { EmptyState, focusRing, PageBody, PageHeader } from "@/components/public/page-parts";
import { getSiteContent } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contact" };

// The SIC email, location and social links (PS-10). There is deliberately no
// contact form in the first release, because a form needs spam protection.
export default async function ContactPage() {
  const site = await getSiteContent();
  const hasAny = site.contactEmail || site.location || site.socialLinks.length > 0;

  return (
    <PageBody>
      <PageHeader title="Contact" intro="Questions about events, membership or partnerships? Reach us here." />
      {hasAny ? (
        <div className="grid gap-4 md:grid-cols-2">
          {site.contactEmail ? (
            <section aria-labelledby="email" className="flex flex-col gap-3 rounded-[16px] border border-line bg-paper p-6">
              <h2 id="email" className="inline-flex items-center gap-2 font-display text-lg font-bold">
                <EnvelopeSimple size={20} aria-hidden="true" className="text-cyan" />
                Email
              </h2>
              <a href={`mailto:${site.contactEmail}`} className={cn("w-fit text-base font-semibold text-cyan underline underline-offset-4 hover:text-cyan-hover rounded-[4px]", focusRing)}>
                {site.contactEmail}
              </a>
            </section>
          ) : null}
          {site.location ? (
            <section aria-labelledby="location" className="flex flex-col gap-3 rounded-[16px] border border-line bg-paper p-6">
              <h2 id="location" className="inline-flex items-center gap-2 font-display text-lg font-bold">
                <MapPin size={20} aria-hidden="true" className="text-cyan" />
                Location
              </h2>
              <p className="text-base leading-relaxed text-ink">{site.location}</p>
            </section>
          ) : null}
          {site.socialLinks.length > 0 ? (
            <section aria-labelledby="social" className="flex flex-col gap-3 rounded-[16px] border border-line bg-paper p-6 md:col-span-2">
              <h2 id="social" className="font-display text-lg font-bold">Follow SIC</h2>
              <ul className="flex flex-wrap gap-2">
                {site.socialLinks.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-cyan-border hover:bg-cyan-muted",
                        focusRing,
                      )}
                    >
                      {link.label}
                      <ArrowSquareOut size={16} aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <EmptyState icon={AddressBook} message="Contact details will be posted soon." />
      )}
    </PageBody>
  );
}
