"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  ArrowsClockwise,
  Lightning,
  VideoCameraSlash,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ScannerViewportProps {
  onScan: (code: string) => void;
  onError?: (errorType: "permission" | "unsupported" | "unreadable") => void;
  active?: boolean;
  className?: string;
}

export function ScannerViewport({
  onScan,
  onError,
  active = true,
  className,
}: ScannerViewportProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const scanControlsRef = React.useRef<{ stop: () => void } | null>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = React.useState<boolean>(true);
  const [permissionDenied, setPermissionDenied] = React.useState<boolean>(false);
  const [torchOn, setTorchOn] = React.useState<boolean>(false);
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("environment");
  const [retryKey, setRetryKey] = React.useState(0);
  const prefersReducedMotion = useReducedMotion();
  const onScanEvent = React.useEffectEvent(onScan);
  const onErrorEvent = React.useEffectEvent((errorType: "permission" | "unsupported" | "unreadable") => {
    onError?.(errorType);
  });

  React.useEffect(() => {
    if (!active) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onErrorEvent("unsupported");
      return;
    }

    let isMounted = true;
    let localStream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then((newStream) => {
        if (!isMounted) {
          newStream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStream = newStream;
        setStream(newStream);
        setPermissionDenied(false);
        setHasCamera(true);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.warn("Camera access failed:", err);
        setPermissionDenied(true);
        onErrorEvent("permission");
      });

    return () => {
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [active, facingMode, retryKey]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!active || !stream || !video) {
      return;
    }

    let cancelled = false;
    const reader = new BrowserQRCodeReader();

    reader
      .decodeFromVideoElement(video, (result) => {
        const ticket = result?.getText().trim();
        if (!ticket) {
          return;
        }

        scanControlsRef.current?.stop();
        onScanEvent(ticket);
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        scanControlsRef.current = controls;
      })
      .catch(() => onErrorEvent("unreadable"));

    return () => {
      cancelled = true;
      scanControlsRef.current?.stop();
      scanControlsRef.current = null;
    };
  }, [active, stream]);

  // Toggle camera switch
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Toggle torch if supported
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const trackAny = track as unknown as {
      getCapabilities?: () => Record<string, unknown>;
      applyConstraints?: (constraints: unknown) => Promise<void>;
    };
    const caps = trackAny.getCapabilities?.();
    if (caps && Boolean(caps.torch) && trackAny.applyConstraints) {
      try {
        await trackAny.applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } catch {
        // Torch not supported
      }
    }
  };

  return (
    <div
      className={cn(
        "relative flex aspect-4/3 w-full flex-col items-center justify-center overflow-hidden rounded-[12px] bg-ink text-paper shadow-md",
        className
      )}
    >
      {/* Background Video Element */}
      {hasCamera && !permissionDenied ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover opacity-85"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red/20 text-red-soft">
            <VideoCameraSlash size={24} weight="bold" />
          </div>
          <p className="max-w-[280px] font-sans text-xs text-paper/80">
            {permissionDenied
              ? "Camera permission was denied. Allow camera access in browser settings, then try again."
              : "Camera preview is unavailable on this device."}
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="flex items-center gap-2 rounded-[6px] bg-cyan px-3 py-1.5 font-sans text-xs font-semibold text-paper transition-all hover:bg-cyan-dark"
          >
            <ArrowsClockwise size={16} weight="bold" />
            Try camera again
          </button>
        </div>
      )}

      {/* Target Reticle Overlay */}
      <div className="pointer-events-none relative flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56">
        {/* Corner Reticles */}
        <div className="absolute top-0 left-0 h-7 w-7 rounded-tl-[8px] border-t-4 border-l-4 border-cyan" />
        <div className="absolute top-0 right-0 h-7 w-7 rounded-tr-[8px] border-t-4 border-r-4 border-cyan" />
        <div className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-[8px] border-b-4 border-l-4 border-cyan" />
        <div className="absolute bottom-0 right-0 h-7 w-7 rounded-br-[8px] border-b-4 border-r-4 border-cyan" />

        {/* Animated Laser / Scan Line */}
        {!prefersReducedMotion && active && (
          <motion.div
            className="absolute left-2 right-2 h-0.5 bg-cyan shadow-[0_0_8px_var(--cyan)]"
            animate={{
              top: ["10%", "90%", "10%"],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>

      {/* Viewfinder Controls / Floating Toolbar */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTorch}
          aria-label="Toggle camera flashlight"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur-xs transition-all hover:bg-ink",
            torchOn && "bg-cyan text-paper"
          )}
        >
          <Lightning size={18} weight="bold" />
        </button>
        <button
          type="button"
          onClick={toggleFacingMode}
          aria-label="Switch camera device"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur-xs transition-all hover:bg-ink"
        >
          <ArrowsClockwise size={18} weight="bold" />
        </button>
      </div>

      {/* Bottom Status Caption */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-[6px] bg-ink/80 px-3 py-1.5 backdrop-blur-xs">
        <span className="flex items-center gap-2 font-sans text-[11px] text-paper/90">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan" />
          Point camera at attendee QR ticket
        </span>
        <span className="font-sans text-[10px] text-paper/60">Live feed</span>
      </div>
    </div>
  );
}
