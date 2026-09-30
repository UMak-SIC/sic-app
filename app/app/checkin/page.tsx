"use client";

import { useState } from "react";

import { QrScanner } from "@/components/scanner/QrScanner";

export default function CheckInPage() {
  const [ticketPayload, setTicketPayload] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-md">
        <QrScanner onDetected={setTicketPayload} />
        <section aria-live="polite" className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
          {ticketPayload ? (
            <>
              <p className="font-mono text-xs tracking-[0.18em] text-cyan-300">TICKET CAPTURED</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-300">{ticketPayload}</p>
              <p className="mt-3 text-sm text-amber-200">Ticket verification will be available when the QR verification API is connected.</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Point the camera at a ticket QR code. Captured tickets are not checked in until server verification is available.</p>
          )}
        </section>
      </div>
    </main>
  );
}
