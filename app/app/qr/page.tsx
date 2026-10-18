import Link from "next/link";
import { ArrowLeft, QrCode } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

// Landing screen for the QR Generator. The generator itself is not built yet;
// this holds the /qr section so the app selector has somewhere to send people.
export default function QrGeneratorPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-canvas text-ink font-sans flex items-center justify-center p-4 sm:p-6">
      <main className="w-full max-w-[520px] bg-paper border border-line rounded-[16px] p-6 sm:p-9 flex flex-col items-center text-center gap-5">
        <span
          aria-hidden="true"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyan-soft text-cyan"
        >
          <QrCode size={24} weight="regular" />
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
            QR Generator
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            This tool is on its way. Soon you&apos;ll be able to make QR codes
            for links, posters, and handouts right here.
          </p>
        </div>

        <Button asChild variant="pillOutline" size="xl" className="w-full sm:w-auto">
          <Link href="/">
            <ArrowLeft size={18} weight="regular" />
            Back to all tools
          </Link>
        </Button>
      </main>
    </div>
  );
}
