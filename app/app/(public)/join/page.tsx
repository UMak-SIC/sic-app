import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ListNumbers, Question } from "@phosphor-icons/react/dist/ssr";

import { FaqList } from "@/components/public/content-parts";
import { EmptyState, focusRing, PageBody, PageHeader, SectionTitle } from "@/components/public/page-parts";
import { getSiteContent, listFaqs } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Join Us" };

// How to become a member, where the form goes, and every FAQ (PS-07).
export default async function JoinPage() {
  const [site, faqs] = await Promise.all([getSiteContent(), listFaqs({ featuredOnly: false })]);

  return (
    <PageBody className="gap-14">
      <PageHeader title="Join Us" intro="Membership is open to every student in a CCIS program at the University of Makati." />

      <section aria-labelledby="steps" className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-5">
          <SectionTitle id="steps">How to become a member</SectionTitle>
          {site.joinSteps.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {site.joinSteps.map((step, index) => (
                <li key={step} className="flex gap-4 rounded-[16px] border border-line bg-paper p-5">
                  <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan font-display text-sm font-bold text-paper">
                    {index + 1}
                  </span>
                  <p className="text-base leading-relaxed text-ink">{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={ListNumbers} message="The membership steps will be posted soon." />
          )}
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-[16px] border border-cyan-border bg-cyan-muted p-6">
          <h2 className="font-display text-lg font-bold">Membership form</h2>
          <p className="text-sm leading-relaxed text-ink">
            {site.membershipFormLocation
              ? `Send your completed form to ${site.membershipFormLocation}.`
              : "Where to send the completed form will be posted soon."}
          </p>
          <Link
            href="/resources#forms"
            className={cn(
              "inline-flex h-11 w-fit items-center gap-2 whitespace-nowrap rounded-full bg-cyan px-5 text-sm font-semibold text-paper hover:bg-cyan-hover active:scale-[0.98]",
              focusRing,
            )}
          >
            Get the form
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </aside>
      </section>

      <section aria-labelledby="faqs" className="flex flex-col gap-5">
        <SectionTitle id="faqs">Frequently asked questions</SectionTitle>
        {faqs.length > 0 ? (
          <FaqList faqs={faqs} group="join-faq" />
        ) : (
          <EmptyState icon={Question} message="Frequently asked questions will be posted soon." />
        )}
      </section>
    </PageBody>
  );
}
