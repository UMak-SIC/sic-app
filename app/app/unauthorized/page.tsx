import { ArrowLeft, ShieldWarning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { SignOutButton } from "./sign-out-button";

// Deliberately outside the (tabs) route group, so it renders without AppShell
// and therefore without the sidebar, the header, or any other admin navigation.
// US-02 requires that a refused operator sees no admin navigation and no
// confidential data, and inheriting the shell would breach that.
//
// This is a plain page route rather than Next's `unauthorized()` convention
// file. That convention is experimental and answers 401, which is the wrong
// status here: the visitor is signed in, they are simply not on the admins
// allowlist, which is 403. `app/app/page.tsx` redirects "/" to /overview, so
// this route is reachable on its own and is linked from the sign-in screen.

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-canvas text-ink font-sans flex items-center justify-center p-4 sm:p-6">
      <main className="w-full max-w-[520px] bg-paper border border-line rounded-[16px] shadow-[0_18px_36px_-18px_rgba(18,51,58,0.18)] p-6 sm:p-9 flex flex-col items-center text-center gap-5">
        <span
          aria-hidden="true"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyan-soft text-cyan"
        >
          <ShieldWarning size={24} weight="bold" />
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
            You don&apos;t have access to this area
          </h1>
          <p className="text-sm font-sans text-muted leading-relaxed">
            You&apos;re signed in, but this account isn&apos;t on the list of
            people who can run events for UMak SIC. Nothing confidential is shown
            here.
          </p>
        </div>

        <div className="w-full rounded-[12px] border border-line-subtle bg-canvas p-4 text-left">
          <p className="text-xs font-sans font-semibold uppercase tracking-wide text-muted">
            How to get access
          </p>
          <p className="mt-1.5 text-sm font-sans text-ink leading-relaxed">
            Ask the UMak SIC council to add your school email to the
            administrator list. Once you&apos;re added, sign in again and this
            page won&apos;t appear.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
          <Button asChild variant="pillOutline" size="xl" className="w-full sm:w-auto">
            <Link href="/login">
              <ArrowLeft size={18} weight="regular" />
              Back to sign in
            </Link>
          </Button>
          <SignOutButton />
        </div>
      </main>
    </div>
  );
}
