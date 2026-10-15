import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  QrCode,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

import { requireAdminPage } from "@/lib/auth/require-admin-page";

import { SignOutButton } from "./unauthorized/sign-out-button";

// The landing screen after sign-in. SIC-APP hosts more than one tool, so the
// operator picks one here and each tool keeps its own section of the site
// (/ems, /qr). Adding a tool means adding an entry below and a guarded layout
// under its prefix.
//
// It sits outside every tool's layout, so it renders without the Event
// Management sidebar, and it guards itself the same way those layouts do.

interface AppChoice {
  title: string;
  description: string;
  href: string;
  icon: Icon;
}

const appChoices: AppChoice[] = [
  {
    title: "Event Management",
    description:
      "Create events, manage attendees, send emails, and check people in.",
    href: "/ems",
    icon: CalendarCheck,
  },
  {
    title: "QR Generator",
    description: "Make QR codes for links, posters, and handouts.",
    href: "/qr",
    icon: QrCode,
  },
];

export default async function AppSelectorPage() {
  await requireAdminPage();

  return (
    <div className="min-h-[100dvh] w-full bg-canvas text-ink font-sans flex items-center justify-center p-4 sm:p-6">
      <main className="w-full max-w-[760px] flex flex-col gap-8">
        <header className="flex flex-col items-center text-center gap-3">
          <Image
            src="/assets/sic_logo_nobg.png"
            alt="UMak SIC Emblem"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
            priority
          />
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
            What would you like to do?
          </h1>
          <p className="text-sm text-muted">
            Choose a tool to get started. You can switch at any time.
          </p>
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {appChoices.map(({ title, description, href, icon: ChoiceIcon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col gap-4 rounded-[16px] border border-line bg-paper p-6 transition-colors hover:border-cyan-border hover:bg-cyan-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-cyan-soft text-cyan"
                >
                  <ChoiceIcon size={24} weight="regular" />
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="text-lg font-display font-bold text-ink">
                    {title}
                  </span>
                  <span className="text-sm text-muted leading-relaxed">
                    {description}
                  </span>
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
                  Open
                  <ArrowRight
                    size={16}
                    weight="bold"
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex justify-center">
          <SignOutButton />
        </div>
      </main>
    </div>
  );
}
