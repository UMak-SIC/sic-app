import Image from "next/image";

import type { Faq, PersonCard } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";

import { initials } from "./page-parts";

// Content building blocks: FAQs (PS-07.4, PS-13) and people cards (PS-03, PS-11).

/**
 * FAQ answers that open and close by touch and keyboard. Native details and
 * summary elements announce their open or closed state to screen readers, and the
 * shared `name` keeps one answer open at a time (PS-13.5).
 */
export function FaqList({ faqs, group }: { faqs: Faq[]; group: string }) {
  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq) => (
        <details
          key={faq.id}
          name={group}
          className="group rounded-[12px] border border-line bg-paper open:border-cyan-border"
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-[12px] px-5 py-3 text-base font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan [&::-webkit-details-marker]:hidden">
            {faq.question}
            <span aria-hidden="true" className="text-xl leading-none text-cyan transition-transform group-open:rotate-45 motion-reduce:transition-none">
              +
            </span>
          </summary>
          <div
            className="public-prose px-5 pb-5 text-sm"
            dangerouslySetInnerHTML={{ __html: faq.answerHtml }}
          />
        </details>
      ))}
    </div>
  );
}

/**
 * A person with a photo, or their initials when there is none (PS-11.3). Photo
 * alt text follows "Photo of <name>, <role>" (PS-11.4).
 */
export function PersonTile({ person }: { person: PersonCard }) {
  return (
    <li className="flex items-center gap-4 rounded-[12px] border border-line bg-paper p-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-cyan-soft">
        {person.photoUrl ? (
          <Image
            src={person.photoUrl}
            alt={`Photo of ${person.name}, ${person.role}`}
            fill
            unoptimized
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label={`No photo for ${person.name}`}
            className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-cyan"
          >
            {initials(person.name)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-display text-base font-bold leading-snug">{person.name}</p>
        <p className="text-sm text-muted">{person.role}</p>
      </div>
    </li>
  );
}

export function PeopleGrid({ people, className }: { people: PersonCard[]; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {people.map((person) => (
        <PersonTile key={person.id} person={person} />
      ))}
    </ul>
  );
}
