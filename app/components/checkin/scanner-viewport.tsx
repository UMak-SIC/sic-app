"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowsClockwise,
  Check,
  Lightning,
  VideoCamera,
  VideoCameraSlash,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { startQrScan } from "@/lib/scanner/qr-scanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ScannerViewportProps {
  onScan: (code: string) => void;
  onError?: (errorType: "permission" | "unsupported" | "unreadable") => void;
  active?: boolean;
  className?: string;
}

const STORAGE_KEY = "umak_sic_scanner_camera_id";

function getSavedDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
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
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(getSavedDeviceId);
  const [scanPulse, setScanPulse] = React.useState(false);

  const prefersReducedMotion = useReducedMotion();
  const onScanEvent = React.useEffectEvent((code: string) => {
    setScanPulse(true);
    setTimeout(() => setScanPulse(false), 350);
    onScan(code);
  });
  const onErrorEvent = React.useEffectEvent((errorType: "permission" | "unsupported" | "unreadable") => {
    onError?.(errorType);
  });

  const updateDevices = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((device) => device.kind === "videoinput");
      setVideoDevices(videoInputs);
      return videoInputs;
    } catch {
      return [];
    }
  }, []);

  // Listen for plug/unplug of USB/external cameras
  React.useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      return;
    }
    const handleDeviceChange = () => {
      void updateDevices();
    };
    navigator.mediaDevices.addEventListener?.("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener?.("devicechange", handleDeviceChange);
    };
  }, [updateDevices]);

  const isUnsupported = typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia;

  React.useEffect(() => {
    if (!active) {
      return;
    }

    if (isUnsupported) {
      onErrorEvent("unsupported");
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    let cancelled = false;

    // Clean up any existing stream before starting a new one
    scanControlsRef.current?.stop();
    scanControlsRef.current = null;
    setStream(null);
    setTorchOn(false);

    startQrScan(video, onScanEvent, {
      deviceId: selectedDeviceId ?? undefined,
      facingMode: selectedDeviceId ? undefined : facingMode,
    })
      .then(async (controls) => {
        // Discard if effect cancelled (unmounted, retried, or device switched)
        if (cancelled) {
          controls.stop();
          return;
        }

        scanControlsRef.current = controls;

        const activeStream = videoRef.current?.srcObject;
        if (activeStream instanceof MediaStream) {
          setStream(activeStream);
        }
        setHasCamera(true);
        setPermissionDenied(false);

        // Once permission is granted, enumerate devices again to capture labels
        const devices = await updateDevices();

        // If active track provides a device ID and none is saved yet, match it
        if (activeStream instanceof MediaStream && devices.length > 0) {
          const activeTrack = activeStream.getVideoTracks()[0];
          const trackSettings = activeTrack?.getSettings?.();
          if (trackSettings?.deviceId && !selectedDeviceId) {
            setSelectedDeviceId(trackSettings.deviceId);
          }
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        scanControlsRef.current = null;
        setStream(null);
        setTorchOn(false);

        const name = error instanceof DOMException ? error.name : undefined;
        if (name === "NotAllowedError" || name === "SecurityError") {
          setPermissionDenied(true);
          onErrorEvent("permission");
          return;
        }
        if (name === "NotFoundError" || name === "OverconstrainedError") {
          setHasCamera(false);
        }
        onErrorEvent("unreadable");
      });

    return () => {
      cancelled = true;
      scanControlsRef.current?.stop();
      scanControlsRef.current = null;
      setStream(null);
      setTorchOn(false);
    };
  }, [active, selectedDeviceId, facingMode, retryKey, isUnsupported, updateDevices]);

  // Handle switching to a specific device
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try {
      window.localStorage.setItem(STORAGE_KEY, deviceId);
    } catch {
      // Ignore storage errors
    }
  };

  // Quick cycle between cameras
  const cycleCamera = () => {
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDevice = videoDevices[nextIndex];
      if (nextDevice?.deviceId) {
        handleSelectDevice(nextDevice.deviceId);
        return;
      }
    }
    // Fallback toggle facing mode
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

  // Active camera display label
  const activeDeviceLabel = React.useMemo(() => {
    if (!videoDevices.length) return null;
    const matched = videoDevices.find((d) => d.deviceId === selectedDeviceId);
    return matched?.label || (selectedDeviceId ? "Connected camera" : "Default camera");
  }, [videoDevices, selectedDeviceId]);

  const cameraUnavailable = isUnsupported || !hasCamera || permissionDenied;

  return (
    <div
      className={cn(
        "relative flex aspect-4/3 w-full flex-col items-center justify-center overflow-hidden rounded-[12px] bg-ink text-paper shadow-md",
        className
      )}
    >
      {/* Background Video Element — always mounted so the scanner never races
          the layout; failures are covered by the panel below. */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn(
          "absolute inset-0 h-full w-full object-cover opacity-85",
          cameraUnavailable && "invisible"
        )}
      />

      {/* Camera Unavailable Panel */}
      {cameraUnavailable && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-soft text-red">
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
            className="flex items-center gap-2 rounded-[6px] bg-cyan px-3 py-1.5 font-sans text-xs font-semibold text-paper transition-all hover:bg-cyan-hover cursor-pointer"
          >
            <ArrowsClockwise size={16} weight="bold" />
            Try camera again
          </button>
        </div>
      )}

      {/* Target Reticle Overlay */}
      <div
        className={cn(
          "pointer-events-none relative flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56 overflow-hidden rounded-[12px] transition-all duration-200",
          scanPulse && "bg-cyan/15 ring-4 ring-cyan/40"
        )}
      >
        {/* Corner Reticles */}
        <div
          className={cn(
            "absolute top-0 left-0 h-7 w-7 rounded-tl-[8px] border-t-4 border-l-4 transition-colors duration-150",
            scanPulse ? "border-green" : "border-cyan"
          )}
        />
        <div
          className={cn(
            "absolute top-0 right-0 h-7 w-7 rounded-tr-[8px] border-t-4 border-r-4 transition-colors duration-150",
            scanPulse ? "border-green" : "border-cyan"
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 left-0 h-7 w-7 rounded-bl-[8px] border-b-4 border-l-4 transition-colors duration-150",
            scanPulse ? "border-green" : "border-cyan"
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 right-0 h-7 w-7 rounded-br-[8px] border-b-4 border-r-4 transition-colors duration-150",
            scanPulse ? "border-green" : "border-cyan"
          )}
        />

        {/* Animated Laser / Scan Line (Hardware GPU Accelerated translate, NO layout reflow) */}
        {!prefersReducedMotion && active && !cameraUnavailable && (
          <motion.div
            className={cn(
              "absolute left-2 right-2 top-2 h-0.5 shadow-[0_0_8px_var(--cyan)] transition-colors duration-150",
              scanPulse ? "bg-green shadow-[0_0_8px_var(--green)]" : "bg-cyan"
            )}
            animate={{
              y: [0, 180, 0],
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
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={toggleTorch}
          aria-label="Toggle camera flashlight"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur-xs transition-all hover:bg-ink cursor-pointer",
            torchOn && "bg-cyan text-paper"
          )}
        >
          <Lightning size={18} weight="bold" />
        </button>

        {/* Camera Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Select camera setup"
              title="Select camera setup"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur-xs transition-all hover:bg-ink cursor-pointer",
                videoDevices.length > 1 && "hover:bg-cyan/90"
              )}
            >
              <VideoCamera size={18} weight="bold" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-[9px] border-line bg-card p-1 shadow-xl">
            <DropdownMenuLabel className="font-display text-[11px] font-bold text-muted uppercase tracking-wider px-2 py-1">
              Camera Setup
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-line" />
            {videoDevices.length > 0 ? (
              videoDevices.map((device, index) => {
                const isSelected =
                  selectedDeviceId === device.deviceId ||
                  (!selectedDeviceId && index === 0);
                const deviceName = device.label || `Camera ${index + 1}`;
                return (
                  <DropdownMenuItem
                    key={device.deviceId || index}
                    onClick={() => handleSelectDevice(device.deviceId)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-1.5 font-sans text-xs text-ink hover:bg-canvas focus:bg-canvas",
                      isSelected && "font-semibold text-cyan"
                    )}
                  >
                    <span className="truncate pr-2">{deviceName}</span>
                    {isSelected && <Check size={14} weight="bold" className="text-cyan shrink-0" />}
                  </DropdownMenuItem>
                );
              })
            ) : (
              <div className="px-2.5 py-2 font-sans text-xs text-muted">
                Default system camera
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Cycle Button */}
        <button
          type="button"
          onClick={cycleCamera}
          aria-label="Switch camera device"
          title="Switch camera device"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur-xs transition-all hover:bg-ink cursor-pointer"
        >
          <ArrowsClockwise size={18} weight="bold" />
        </button>
      </div>

      {/* Bottom Status Caption */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-[6px] bg-ink/80 px-3 py-1.5 backdrop-blur-xs">
        <span className="flex items-center gap-2 font-sans text-[11px] text-paper/90 truncate mr-2">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-cyan" />
          <span className="truncate">Point camera at attendee QR ticket</span>
        </span>
        <span className="font-sans text-[10px] text-paper/60 shrink-0">
          {activeDeviceLabel ? activeDeviceLabel : "Live feed"}
        </span>
      </div>
    </div>
  );
}
