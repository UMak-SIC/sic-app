"use client";

import { BrowserQRCodeReader } from "@zxing/browser";

export type QrScanControls = { stop: () => void };

export interface StartQrScanOptions {
  /** Specific video device ID to target. Takes priority over facingMode. */
  deviceId?: string;
  /** Which camera to prefer when deviceId is not specified. Defaults to the rear camera. */
  facingMode?: "user" | "environment";
  /**
   * How long the same QR payload is ignored right after it was detected, so a
   * ticket held in front of the camera does not fire check-in twice.
   */
  cooldownMs?: number;
}

const DEFAULT_COOLDOWN_MS = 2000;

/**
 * Starts a continuous QR scan on the given video element.
 *
 * The reader owns the camera end to end: it requests the stream, attaches it
 * to the video element, and only begins decoding once the video is actually
 * playing. Handing the library a manually wired video (our own getUserMedia
 * call plus decodeFromVideoElement) raced the camera startup and killed the
 * decode loop silently, so every scanner must go through here.
 *
 * Scanning keeps running after a detection — callers stop it via the returned
 * controls. Repeats of the same payload within the cooldown are ignored.
 */
export async function startQrScan(
  video: HTMLVideoElement,
  onDetected: (payload: string) => void,
  options: StartQrScanOptions = {},
): Promise<QrScanControls> {
  const reader = new BrowserQRCodeReader();
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;

  let lastPayload: string | null = null;
  let lastDetectedAt = 0;

  const videoConstraints: MediaTrackConstraints = options.deviceId
    ? { deviceId: { exact: options.deviceId } }
    : { facingMode: options.facingMode ? { ideal: options.facingMode } : { ideal: "environment" } };

  const controls = await reader.decodeFromConstraints(
    {
      audio: false,
      video: videoConstraints,
    },
    video,
    (result) => {
      const payload = result?.getText().trim();
      if (!payload) return;

      const now = Date.now();
      if (payload === lastPayload && now - lastDetectedAt < cooldownMs) return;
      lastPayload = payload;
      lastDetectedAt = now;

      try {
        onDetected(payload);
      } catch (err) {
        console.warn("QR scanner detection handler error:", err);
      }
    },
  );

  return controls;
}
