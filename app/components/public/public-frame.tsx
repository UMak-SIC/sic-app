import Image from "next/image";
import Link from "next/link";
import { EnvelopeSimple, MapPin } from "@phosphor-icons/react/dist/ssr";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getSiteContent } from "@/lib/public-site/content";
import { PUBLIC_SECTIONS } from "@/lib/public-site/sections";

import { SiteNav } from "./site-nav";

// The frame around every public page (PS-01): header with the ten sections and
// the sign-in or Dashboard link, the page, and a footer with contact details,
// social links and the Privacy Notice link. Used by app/app/(public)/layout.tsx
// and by app/app/not-found.tsx, which renders outside that layout.

/** True when the visitor is signed in and on the allowlist (PS-01.3). */
async function isAllowlistedVisitor(): Promise<boolean> {
  try {
    return !((await requireAdmin()) instanceof Response);
  } catch {
    // Sign-in not configured (a local build or test run): show "Sign in".
    return false;
  }
}

const linkFocus =
  "rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export async function PublicFrame({ children }: { children: React.ReactNode }) {
  const [site, signedIn] = await Promise.all([getSiteContent(), isAllowlistedVisitor()]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:ring-2 focus:ring-cyan"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className={`flex items-center gap-2.5 ${linkFocus}`}>
            <Image
              src="/assets/sic_logo_nobg.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="font-display text-base font-bold leading-tight tracking-tight">
              UMak SIC
              <span className="sr-only">, Society of Innovative Computing home</span>
            </span>
          </Link>
          <SiteNav signedIn={signedIn} />
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/sic_logo_nobg.png"
                alt="UMak SIC emblem"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <p className="font-display text-lg font-bold leading-snug tracking-tight">
                Society of Innovative Computing
              </p>
            </div>
            <p className="max-w-[40ch] text-sm leading-relaxed text-muted">
              A student organization of the College of Computing and Information Sciences,
              University of Makati.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <h2 className="font-display text-base font-bold">Get in touch</h2>
            {site.contactEmail ? (
              <a href={`mailto:${site.contactEmail}`} className={`inline-flex items-center gap-2 text-ink hover:text-cyan ${linkFocus}`}>
                <EnvelopeSimple size={18} aria-hidden="true" />
                {site.contactEmail}
              </a>
            ) : null}
            {site.location ? (
              <p className="inline-flex items-start gap-2 text-muted">
                <MapPin size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
                {site.location}
              </p>
            ) : null}
            {site.socialLinks.length > 0 ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {site.socialLinks.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className={`font-medium text-cyan hover:text-cyan-hover ${linkFocus}`}>
                      {link.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {!site.contactEmail && !site.location && site.socialLinks.length === 0 ? (
              <p className="text-muted">Contact details will be posted soon.</p>
            ) : null}
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-3 text-sm">
            <h2 className="font-display text-base font-bold">Explore</h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {PUBLIC_SECTIONS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={`text-ink hover:text-cyan ${linkFocus}`}>
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/privacy" className={`text-ink hover:text-cyan ${linkFocus}`}>
                  Privacy Notice
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-line-subtle">
          <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6">
            University of Makati Society of Innovative Computing
          </p>
        </div>
      </footer>
    </div>
  );
}
