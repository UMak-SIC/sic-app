import Link from "next/link";
import { connection } from "next/server";
import { Compass } from "@phosphor-icons/react/dist/ssr";

import { focusRing, PageBody } from "@/components/public/page-parts";
import { PublicFrame } from "@/components/public/public-frame";
import { cn } from "@/lib/utils";

// A plain-language page-not-found screen inside the site frame (PS-01.8).
export default async function NotFound() {
  await connection();
  return (
    <PublicFrame>
      <PageBody className="items-start py-16 md:py-24">
        <span aria-hidden="true" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-soft text-cyan">
          <Compass size={24} />
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            We could not find that page
          </h1>
          <p className="max-w-[60ch] text-base leading-relaxed text-muted">
            The link may be old, or the page may have moved. Start again from the home page.
          </p>
        </div>
        <Link
          href="/"
          className={cn(
            "inline-flex h-11 items-center rounded-full bg-cyan px-6 text-sm font-semibold text-paper hover:bg-cyan-hover active:scale-[0.98]",
            focusRing,
          )}
        >
          Go to Home
        </Link>
      </PageBody>
    </PublicFrame>
  );
}
