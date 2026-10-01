"use client";

import Image from "next/image";
import { Check } from "@phosphor-icons/react";
import QRCode from "qrcode";
import * as React from "react";

type MockQrTicketPassProps = {
  attendeeName: string;
  studentId: string;
  eventName?: string;
};

export function MockQrTicketPass({
  attendeeName,
  studentId,
  eventName = "General Assembly 2026",
}: MockQrTicketPassProps) {
  const [qrImage, setQrImage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    void QRCode.toDataURL(`UMAK-SIC-PREVIEW:${studentId}`, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 4,
    }).then((image) => {
      if (active) setQrImage(image);
    });

    return () => { active = false; };
  }, [studentId]);

  return (
    <div className="rounded-[12px] border border-line bg-card p-4 shadow-xs flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[4px] bg-ink text-paper font-display font-bold text-[10px] flex items-center justify-center">SIC</div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-xs text-ink leading-tight">UMak CCIS Practice Pass</span>
            <span className="text-[10px] text-muted font-sans leading-none">{eventName}</span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-soft border border-amber-border text-amber font-bold text-[10px]">
          <Check size={11} weight="bold" />
          <span>PRACTICE ONLY</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 items-center pt-1">
        <div className="col-span-7 flex flex-col gap-2.5 text-left">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted font-display block">ATTENDEE NAME</span>
            <span className="font-display font-bold text-xs sm:text-sm text-ink block truncate">{attendeeName}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted font-display block">STUDENT ID NUMBER</span>
            <span className="font-mono text-[11px] font-bold text-ink block">{studentId}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted font-display block">HALL ACCESS</span>
            <span className="text-[11px] font-semibold text-cyan block font-sans">AVR · Gate 2 Access</span>
          </div>
        </div>

        <div className="col-span-5 flex flex-col items-center justify-center p-2 rounded-[8px] bg-paper border border-line">
          {qrImage ? (
            <Image src={qrImage} alt="Preview QR ticket pass" width={80} height={80} unoptimized />
          ) : (
            <div className="h-20 w-20 rounded-[4px] bg-canvas" aria-label="Loading preview QR pass" />
          )}
          <span className="text-[9px] uppercase tracking-wider font-bold text-muted font-display mt-1 text-center">PREVIEW QR PASS</span>
        </div>
      </div>

      <div className="border-t border-dashed border-line pt-2 flex items-center justify-between text-[10px] text-muted">
          <span className="font-mono text-[10px] text-muted-light">Not a check-in code</span>
          <span className="font-sans text-muted">Practice email only</span>
      </div>
    </div>
  );
}
