"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle, QrCode, WarningCircle } from "@phosphor-icons/react";

import { startQrScan } from "@/lib/scanner/qr-scanner";
import type { CheckInResponse } from "@/lib/services/checkin-service";

type CheckInEvent = { id: string; name: string };

export function QrScanner({ events }: { events: CheckInEvent[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualPayload, setManualPayload] = useState("");
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [result, setResult] = useState<CheckInResponse | null>(null);
  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }

  useEffect(() => {
    return stopScanner;
  }, []);

  async function submitTicket(ticketTokenOrCode: string) {
    if (!eventId) {
      setError("Choose an event before checking in an attendee.");
      return;
    }

    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/checkin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketTokenOrCode }),
      });
      const data = (await response.json()) as CheckInResponse | { error: string };

      if (!response.ok || "error" in data) {
        setError("error" in data ? data.error : "We could not check in that attendee. Please try again.");
        return;
      }

      setResult(data);
    } catch {
      setError("We could not check in that attendee. Check your connection and try again.");
    }
  }

  async function startScanner() {
    if (!eventId) {
      setError("Choose an event before opening the camera.");
      return;
    }

    try {
      const video = videoRef.current;
      if (!video) return;

      setError(null);
      setIsScanning(true);
      controlsRef.current = await startQrScan(video, (payload) => {
        stopScanner();
        void submitTicket(payload);
      });
    } catch {
      setError("Camera access was not granted. Allow camera access, then try again.");
      stopScanner();
    }
  }

  function submitManualPayload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = manualPayload.trim();
    if (!payload) return;
    void submitTicket(payload);
    setManualPayload("");
  }

  return (
    <section aria-labelledby="scanner-heading" className="rounded-[12px] border border-line bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-sans text-xs font-semibold tracking-[0.18em] text-cyan">LIVE CHECK-IN</p>
          <h1 className="mt-1 font-display text-2xl font-bold" id="scanner-heading">Scan ticket</h1>
        </div>
        <span className={isScanning ? "rounded-full bg-cyan-soft px-2 py-1 font-sans text-xs font-semibold text-cyan-dark" : "rounded-full bg-canvas px-2 py-1 font-sans text-xs text-muted"}>
          {isScanning ? "Camera active" : "Camera idle"}
        </span>
      </div>

      <label className="mt-5 block font-sans text-sm font-semibold" htmlFor="checkin-event">
        Event
      </label>
      <select
        className="mt-2 w-full rounded-[6px] border border-line bg-paper px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
        id="checkin-event"
        onChange={(event) => setEventId(event.target.value)}
        value={eventId}
      >
        {events.length === 0 ? <option value="">No published events available</option> : null}
        {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
      </select>

      <div className="relative mt-5 aspect-[3/4] overflow-hidden rounded-[9px] bg-ink">
        <video aria-label="QR scanner camera feed" autoPlay className="h-full w-full object-cover" muted playsInline ref={videoRef} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-[16%] border-2 border-cyan" />
      </div>

      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-[6px] bg-cyan px-4 py-3 font-sans text-sm font-semibold text-paper transition-colors hover:bg-cyan-hover disabled:cursor-not-allowed disabled:opacity-60" disabled={isScanning || !eventId} onClick={startScanner} type="button">
        <Camera aria-hidden="true" size={18} weight="bold" />
        {isScanning ? "Looking for ticket" : "Open camera"}
      </button>
      {error && <p className="mt-3 rounded-[6px] border border-red/30 bg-red-soft p-3 font-sans text-sm text-red" role="alert">{error}</p>}

      {result ? (
        <div aria-live="polite" className={`mt-3 rounded-[6px] border p-3 font-sans text-sm ${result.status === "success" ? "border-green/30 bg-green-soft text-green" : "border-red/30 bg-red-soft text-red"}`}>
          <div className="flex items-start gap-2">
            {result.status === "success" ? <CheckCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} weight="bold" /> : <WarningCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} weight="bold" />}
            <span>{result.message}</span>
          </div>
        </div>
      ) : null}

      <form className="mt-5 border-t border-line pt-4" onSubmit={submitManualPayload}>
        <label className="font-sans text-sm font-semibold" htmlFor="ticket-code">Enter ticket or student ID</label>
        <div className="mt-2 flex gap-2">
          <input className="min-w-0 flex-1 rounded-[6px] border border-line bg-paper px-3 py-2 font-sans text-sm text-ink outline-none placeholder:text-muted-light focus:border-cyan focus:ring-2 focus:ring-cyan/20" id="ticket-code" onChange={(event) => setManualPayload(event.target.value)} placeholder="Paste a ticket or enter a student ID" value={manualPayload} />
          <button className="flex shrink-0 items-center gap-1.5 rounded-[6px] border border-line px-3 py-2 font-sans text-sm font-semibold text-ink transition-colors hover:bg-canvas" type="submit"><QrCode aria-hidden="true" size={18} weight="regular" />Check in</button>
        </div>
      </form>
    </section>
  );
}
