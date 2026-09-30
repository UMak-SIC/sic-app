"use client";

import { useEffect, useRef, useState } from "react";

import { startQrScan } from "@/lib/scanner/qr-scanner";

export function QrScanner({ onDetected }: { onDetected: (payload: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualPayload, setManualPayload] = useState("");
  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }

  useEffect(() => {
    return stopScanner;
  }, []);

  async function startScanner() {
    try {
      const video = videoRef.current;
      if (!video) return;

      setError(null);
      setIsScanning(true);
      controlsRef.current = await startQrScan(video, (payload) => {
        stopScanner();
        onDetected(payload);
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
    onDetected(payload);
    setManualPayload("");
  }

  return (
    <section aria-labelledby="scanner-heading" className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl shadow-cyan-950/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-cyan-300">CHECK-IN TERMINAL</p>
          <h1 className="mt-1 text-2xl font-semibold" id="scanner-heading">Scan ticket</h1>
        </div>
        <span className={isScanning ? "rounded-full bg-cyan-300/15 px-2 py-1 text-xs text-cyan-200" : "rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400"}>
          {isScanning ? "Camera active" : "Camera idle"}
        </span>
      </div>

      <div className="relative mt-5 aspect-[3/4] overflow-hidden rounded-xl bg-slate-950">
        <video aria-label="QR scanner camera feed" autoPlay className="h-full w-full object-cover" muted playsInline ref={videoRef} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-[16%] border-2 border-cyan-300 shadow-[0_0_0_100vmax_rgb(2_6_23_/_0.65)]" />
      </div>

      <button className="mt-4 w-full rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60" disabled={isScanning} onClick={startScanner} type="button">
        {isScanning ? "Looking for QR code..." : "Open camera"}
      </button>
      {error && <p className="mt-3 text-sm text-amber-200" role="alert">{error}</p>}

      <form className="mt-5 border-t border-slate-700 pt-4" onSubmit={submitManualPayload}>
        <label className="text-sm font-medium" htmlFor="ticket-code">Ticket code fallback</label>
        <div className="mt-2 flex gap-2">
          <input className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm outline-none focus:border-cyan-300" id="ticket-code" onChange={(event) => setManualPayload(event.target.value)} placeholder="Paste opaque ticket" value={manualPayload} />
          <button className="rounded border border-slate-500 px-3 py-2 text-sm font-semibold" type="submit">Use</button>
        </div>
      </form>
    </section>
  );
}
