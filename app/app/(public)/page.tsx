import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarBlank, Newspaper } from "@phosphor-icons/react/dist/ssr";

import { EventFacts, RegisterLink } from "@/components/public/event-parts";
import { FaqList } from "@/components/public/content-parts";
import { EmptyState, focusRing, PageBody, SectionTitle } from "@/components/public/page-parts";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import { getSiteContent, listFaqs, listPublishedNews } from "@/lib/public-site/content";
import { getNextEvent } from "@/lib/public-site/events";
import { formatPostDate } from "@/lib/public-site/format";
import { PUBLIC_SECTIONS } from "@/lib/public-site/sections";
import { cn } from "@/lib/utils";

// Home (PS-02, PS-13): who SIC is, the next event, the latest news, links to every
// section, and the featured FAQs.

const DEFAULT_STATEMENT =
  "A student community at UMak's College of Computing and Information Sciences for mentorship, skill-building and research.";

export default async function HomePage() {
  const now = new Date();
  const timeZone = getOrganizationTimezone();
  const [site, nextEvent, news, faqs] = await Promise.all([
    getSiteContent(),
    getNextEvent(now),
    listPublishedNews(1, 3),
    listFaqs({ featuredOnly: true }),
  ]);
  const [leadPost, ...otherPosts] = news.posts;

  return (
    <>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] md:pt-16">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight xl:text-[2.75rem]">
              Society of Innovative Computing
            </h1>
            <p className="max-w-[52ch] text-lg leading-relaxed text-muted">
              {site.homeStatement ?? DEFAULT_STATEMENT}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/events"
                className={cn(
                  "inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-cyan px-6 text-sm font-semibold text-paper hover:bg-cyan-hover active:scale-[0.98]",
                  focusRing,
                )}
              >
                See events
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              <Link
                href="/join"
                className={cn(
                  "inline-flex h-12 items-center whitespace-nowrap rounded-full border border-line bg-paper px-6 text-sm font-semibold text-ink hover:border-cyan-border hover:bg-cyan-muted active:scale-[0.98]",
                  focusRing,
                )}
              >
                Become a member
              </Link>
            </div>
          </div>

          <aside aria-labelledby="next-event" className="relative overflow-hidden rounded-[16px] border border-line bg-gradient-to-br from-zen-from via-zen-via to-zen-to p-6 sm:p-8">
            <Image
              src="/assets/sic_logo_nobg.png"
              alt=""
              width={220}
              height={220}
              priority
              className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 object-contain opacity-15"
            />
            <div className="relative flex flex-col gap-4">
              <p id="next-event" className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan">
                Next event
              </p>
              {nextEvent ? (
                <>
                  <h2 className="font-display text-2xl font-bold leading-snug tracking-tight">
                    {nextEvent.name}
                  </h2>
                  <EventFacts event={nextEvent} timeZone={timeZone} />
                  <div className="flex flex-wrap gap-3 pt-1">
                    {nextEvent.registrationLink ? (
                      <RegisterLink href={nextEvent.registrationLink} eventName={nextEvent.name} />
                    ) : null}
                    <Link
                      href={`/events/${nextEvent.id}`}
                      className={cn(
                        "inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-border bg-paper px-5 text-sm font-semibold text-ink hover:bg-cyan-muted",
                        focusRing,
                      )}
                    >
                      Event details<span className="sr-only">: {nextEvent.name}</span>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <CalendarBlank size={24} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan" />
                  <p className="text-base leading-relaxed text-ink">
                    No upcoming events yet. New events are posted here and on the calendar as soon
                    as they are announced.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <PageBody className="gap-14">
        <section aria-labelledby="latest-news" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionTitle id="latest-news">Latest news</SectionTitle>
            {news.total > 0 ? (
              <Link href="/news" className={cn("inline-flex items-center gap-1.5 text-sm font-semibold text-cyan hover:text-cyan-hover rounded-[4px]", focusRing)}>
                All news
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          {leadPost ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <article className="relative flex flex-col justify-end overflow-hidden rounded-[16px] border border-line bg-gradient-to-br from-zen-from via-zen-via to-zen-to p-6 sm:min-h-64">
                {leadPost.coverUrl ? (
                  <>
                    <Image src={leadPost.coverUrl} alt="" fill unoptimized sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-paper via-paper/80 to-transparent" />
                  </>
                ) : (
                  <Image
                    src="/assets/sic_logo_nobg.png"
                    alt=""
                    width={180}
                    height={180}
                    className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 object-contain opacity-15"
                  />
                )}
                <p className="relative text-xs text-muted">{formatPostDate(leadPost.postDate)}</p>
                <h3 className="relative mt-2 font-display text-2xl font-bold leading-snug tracking-tight">
                  <Link href={`/news/${leadPost.id}`} className={cn("after:absolute after:inset-0 hover:text-cyan rounded-[4px]", focusRing)}>
                    {leadPost.title}
                  </Link>
                </h3>
              </article>
              {otherPosts.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {otherPosts.map((post) => (
                    <li key={post.id} className="relative rounded-[16px] border border-line bg-paper p-5">
                      <p className="text-xs text-muted">{formatPostDate(post.postDate)}</p>
                      <h3 className="mt-1.5 font-display text-lg font-bold leading-snug">
                        <Link href={`/news/${post.id}`} className={cn("after:absolute after:inset-0 hover:text-cyan rounded-[4px]", focusRing)}>
                          {post.title}
                        </Link>
                      </h3>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <EmptyState icon={Newspaper} message="No news has been posted yet. Announcements will appear here." />
          )}
        </section>

        {faqs.length > 0 ? (
          <section aria-labelledby="home-faqs" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="flex flex-col gap-3">
              <SectionTitle id="home-faqs">Questions students ask</SectionTitle>
              <Link href="/join#faqs" className={cn("inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-cyan hover:text-cyan-hover rounded-[4px]", focusRing)}>
                See all FAQs
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <FaqList faqs={faqs} group="home-faq" />
          </section>
        ) : null}

        <nav aria-labelledby="explore" className="flex flex-col gap-4 rounded-[16px] bg-ink p-6 text-paper sm:p-8">
          <h2 id="explore" className="font-display text-2xl font-bold tracking-tight">
            Explore SIC
          </h2>
          <ul className="flex flex-wrap gap-2">
            {PUBLIC_SECTIONS.filter(({ href }) => href !== "/").map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex h-10 items-center rounded-full border border-paper/25 px-4 text-sm font-semibold text-paper hover:bg-paper/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-border"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </PageBody>
    </>
  );
}
