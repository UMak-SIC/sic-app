"use client";

import { BrowserQRCodeReader } from "@zxing/browser";

export type QrScanControls = { stop: () => void };

export async function startQrScan(video: HTMLVideoElement, onDetected: (payload: string) => void): Promise<QrScanControls> {
  const reader = new BrowserQRCodeReader();

  const controls = await reader.decodeFromConstraints(
    { audio: false, video: { facingMode: { ideal: "environment" } } },
    video,
    (result) => {
      const payload = result?.getText().trim();
      if (!payload) return;
      controls.stop();
      onDetected(payload);
    },
  );

  return controls;
}
