import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { EventFacts, PhotoGallery, RegisterLink, SdeVideo } from "@/components/public/event-parts";
import { focusRing, PageBody, SectionTitle } from "@/components/public/page-parts";
import { getOrganizationTimezone } from "@/lib/events/organization-timezone";
import { getPublicEvent } from "@/lib/public-site/events";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getPublicEvent((await params).id, new Date());
  return { title: event?.name ?? "Event" };
}

// One event's full details (PS-05.4). A past event shows its SDE videos above its
// photo gallery (PS-14.1, PS-05.5); upcoming events never show either.
// Speakers (AD-04) are added to this page when that story lands.
export default async function EventPage({ params }: Props) {
  const now = new Date();
  const event = await getPublicEvent((await params).id, now);
  if (!event) notFound();
  const timeZone = getOrganizationTimezone();

  return (
    <PageBody className="gap-12">
      <Link href="/events" className={cn("inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-cyan rounded-[4px]", focusRing)}>
        <ArrowLeft size={16} aria-hidden="true" />
        All events
      </Link>

      <article className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {event.isPast ? (
              <p className="w-fit rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-muted ring-1 ring-line">
                Past event
              </p>
            ) : null}
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-balance md:text-4xl">
              {event.name}
            </h1>
          </div>
          {event.coverUrl ? (
            <div className="relative aspect-[16/9] overflow-hidden rounded-[16px] border border-line">
              <Image src={event.coverUrl} alt="" fill unoptimized priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
            </div>
          ) : null}
          <p className="max-w-[70ch] whitespace-pre-line text-base leading-relaxed text-ink">{event.details}</p>
        </div>

        <aside className="flex h-fit flex-col gap-5 rounded-[16px] border border-line bg-paper p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold">When and where</h2>
          <EventFacts event={event} timeZone={timeZone} />
          {!event.isPast && event.registrationLink ? (
            <RegisterLink href={event.registrationLink} eventName={event.name} />
          ) : null}
          {!event.isPast ? (
            <p className="text-sm leading-relaxed text-muted">
              Students on the event list receive an email invitation with a QR ticket to show at the
              entrance.
            </p>
          ) : null}
        </aside>
      </article>

      {event.sdeVideos.length > 0 ? (
        <section aria-labelledby="sde" className="flex flex-col gap-5">
          <SectionTitle id="sde">SDE Video</SectionTitle>
          <div className="grid gap-8 lg:grid-cols-2">
            {event.sdeVideos.map((video) => (
              <SdeVideo key={video.id} video={video} eventName={event.name} />
            ))}
          </div>
        </section>
      ) : null}

      {event.photos.length > 0 ? (
        <section aria-labelledby="photos" className="flex flex-col gap-5">
          <SectionTitle id="photos">Photos</SectionTitle>
          <PhotoGallery photos={event.photos} />
        </section>
      ) : null}
    </PageBody>
  );
}
