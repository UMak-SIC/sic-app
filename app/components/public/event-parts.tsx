import Image from "next/image";
import Link from "next/link";
import {
  ArrowSquareOut,
  CalendarBlank,
  Clock,
  MapPin,
  PlayCircle,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";

import {
  formatEventDate,
  formatEventTime,
  formatShortDate,
  formatZoneName,
} from "@/lib/public-site/format";
import type { PublicEventCard, PublicPhoto, PublicSdeVideo } from "@/lib/public-site/events";
import { cn } from "@/lib/utils";

import { focusRing } from "./page-parts";

// Event building blocks for Home, Events and the event page (PS-02, PS-05, PS-14).
// Times are always shown in the organization timezone and labelled with it.

export function EventFacts({ event, timeZone }: { event: PublicEventCard; timeZone: string }) {
  return (
    <dl className="grid gap-2 text-sm text-ink">
      <div className="flex items-start gap-2">
        <dt className="sr-only">Date</dt>
        <CalendarBlank size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan" />
        <dd>{formatEventDate(event.startsAt, timeZone)}</dd>
      </div>
      <div className="flex items-start gap-2">
        <dt className="sr-only">Time</dt>
        <Clock size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan" />
        <dd>
          {formatEventTime(event.startsAt, event.endsAt, timeZone)}{" "}
          <span className="text-muted">({formatZoneName(event.startsAt, timeZone)})</span>
        </dd>
      </div>
      {event.venue ? (
        <div className="flex items-start gap-2">
          <dt className="sr-only">Venue</dt>
          <MapPin size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan" />
          <dd>{event.venue}</dd>
        </div>
      ) : null}
      {event.theme ? (
        <div className="flex items-start gap-2">
          <dt className="sr-only">Theme</dt>
          <Sparkle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan" />
          <dd>{event.theme}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/** Opens the event's external registration form in a new tab (PS-05.3). */
export function RegisterLink({ href, eventName }: { href: string; eventName: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-11 w-fit items-center gap-2 whitespace-nowrap rounded-full bg-cyan px-5 text-sm font-semibold text-paper hover:bg-cyan-hover active:scale-[0.98]",
        focusRing,
      )}
    >
      Register
      <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
      <span className="sr-only"> for {eventName} (opens in a new tab)</span>
    </a>
  );
}

function Cover({ url, sizes, className }: { url: string | null; sizes: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-zen-from via-zen-via to-zen-to", className)}>
      {url ? (
        // Event covers live in our file storage, whose host is configured per
        // deployment, so they are served as-is rather than through the optimizer.
        <Image src={url} alt="" fill sizes={sizes} unoptimized className="object-cover" />
      ) : (
        <Image
          src="/assets/sic_logo_nobg.png"
          alt=""
          width={72}
          height={72}
          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 object-contain opacity-80"
        />
      )}
    </div>
  );
}

/** An upcoming event with everything a student needs to decide (PS-05.2, PS-05.3). */
export function UpcomingEventCard({ event, timeZone }: { event: PublicEventCard; timeZone: string }) {
  return (
    <article className="grid overflow-hidden rounded-[16px] border border-line bg-paper md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Cover url={event.coverUrl} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[16/9] md:aspect-auto md:min-h-56" />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <h3 className="font-display text-xl font-bold leading-snug tracking-tight">
          <Link href={`/events/${event.id}`} className={cn("hover:text-cyan", focusRing, "rounded-[4px]")}>
            {event.name}
          </Link>
        </h3>
        <EventFacts event={event} timeZone={timeZone} />
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
          {event.registrationLink ? (
            <RegisterLink href={event.registrationLink} eventName={event.name} />
          ) : null}
          <Link
            href={`/events/${event.id}`}
            className={cn(
              "inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-cyan-border hover:bg-cyan-muted",
              focusRing,
            )}
          >
            Event details<span className="sr-only">: {event.name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/** A past event; a play icon marks events with an SDE video (PS-14.3). */
export function PastEventCard({ event, timeZone }: { event: PublicEventCard; timeZone: string }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[16px] border border-line bg-paper transition-colors hover:border-cyan-border">
      <Cover url={event.coverUrl} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="aspect-[16/9]" />
      <div className="flex flex-col gap-1.5 p-4">
        <p className="text-xs text-muted">{formatShortDate(event.startsAt, timeZone)}</p>
        <h3 className="font-display text-base font-bold leading-snug">
          <Link href={`/events/${event.id}`} className={cn("after:absolute after:inset-0", focusRing, "rounded-[4px]")}>
            {event.name}
          </Link>
        </h3>
        {event.hasSdeVideo ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan">
            <PlayCircle size={16} weight="bold" aria-hidden="true" />
            SDE video
          </p>
        ) : null}
      </div>
    </article>
  );
}

/**
 * One SDE video (PS-14.2). A linked video plays in an embedded player, with a
 * "Watch on" link for platforms that block embedding. An uploaded video plays in
 * the browser's own player and downloads nothing until play is pressed.
 */
export function SdeVideo({ video, eventName }: { video: PublicSdeVideo; eventName: string }) {
  const title = video.title ?? `${eventName} SDE video`;
  return (
    <figure className="flex flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-[12px] border border-line bg-ink">
        {video.link?.embedUrl ? (
          <iframe
            src={video.link.embedUrl}
            title={title}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        ) : video.file ? (
          <video controls preload="none" className="absolute inset-0 h-full w-full" aria-label={title}>
            <source src={video.file.url} type={video.file.mediaType} />
          </video>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-paper">
            This video plays on {video.link?.platform}.
          </div>
        )}
      </div>
      <figcaption className="flex flex-col gap-1">
        {video.title ? <span className="font-display text-base font-bold">{video.title}</span> : null}
        {video.caption ? <span className="text-sm leading-relaxed text-muted">{video.caption}</span> : null}
        {video.link ? (
          <a
            href={video.link.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-cyan hover:text-cyan-hover", focusRing, "rounded-[4px]")}
          >
            Watch on {video.link.platform}
            <ArrowSquareOut size={16} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}

/** A past event's photos, each with its alt text (PS-05.5). */
export function PhotoGallery({ photos }: { photos: PublicPhoto[] }) {
  const ordered = [...photos.filter((photo) => photo.isCover), ...photos.filter((photo) => !photo.isCover)];
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((photo, index) => (
        <li
          key={photo.id}
          className={cn(
            "relative overflow-hidden rounded-[12px] border border-line bg-paper",
            index === 0 ? "aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto" : "aspect-[4/3]",
          )}
        >
          <Image src={photo.url} alt={photo.altText} fill unoptimized sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        </li>
      ))}
    </ul>
  );
}
