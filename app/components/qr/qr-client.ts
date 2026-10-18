"use client";

import QRCode from "qrcode";

export type QrLink = {
  id: string;
  code: string;
  name: string;
  destination: string;
  viewCount: number;
  status: "ACTIVE" | "DISABLED";
  expiresAt: string | null;
  qrForeground: string;
  qrBackground: string;
  qrLogoAssetId: string | null;
  qrLogoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QrLinkInput = {
  name?: string;
  destination: string;
  expiresAt?: string | null;
  qrForeground?: string;
  qrBackground?: string;
  qrLogoAssetId?: string | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : "Something went wrong. Please try again.",
    );
  }
  return body as T;
}

export async function listQrLinks(): Promise<QrLink[]> {
  const response = await fetch("/api/qr/links", { cache: "no-store" });
  return (await readJson<{ links: QrLink[] }>(response)).links;
}

export async function createQrLink(input: QrLinkInput): Promise<QrLink> {
  const response = await fetch("/api/qr/links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await readJson<{ link: QrLink }>(response)).link;
}

export async function updateQrLink(id: string, input: Partial<QrLinkInput>): Promise<QrLink> {
  const response = await fetch(`/api/qr/links/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await readJson<{ link: QrLink }>(response)).link;
}

export async function setQrLinkStatus(
  id: string,
  status: "ACTIVE" | "DISABLED",
): Promise<QrLink> {
  const response = await fetch(`/api/qr/links/${id}/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return (await readJson<{ link: QrLink }>(response)).link;
}

export async function deleteQrLink(id: string): Promise<void> {
  const response = await fetch(`/api/qr/links/${id}`, { method: "DELETE" });
  if (!response.ok) await readJson<never>(response);
}

export async function uploadQrLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/assets/public/upload", { method: "POST", body: formData });
  return (await readJson<{ assetId: string }>(response)).assetId;
}

export function shortUrlForCode(origin: string, code: string): string {
  return new URL(`/url/${code}`, origin).toString();
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The QR logo could not be loaded."));
    image.src = source;
  });
}

export async function generateQrPng(
  link: QrLink,
  origin: string,
  onLogoError?: () => void,
): Promise<string> {
  const qr = await QRCode.toDataURL(shortUrlForCode(origin, link.code), {
    errorCorrectionLevel: link.qrLogoUrl ? "H" : "M",
    margin: 2,
    width: 1024,
    color: { dark: link.qrForeground, light: link.qrBackground },
  });

  if (!link.qrLogoUrl || typeof document === "undefined") return qr;

  try {
    const [qrImage, logoImage] = await Promise.all([loadImage(qr), loadImage(link.qrLogoUrl)]);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");

    context.drawImage(qrImage, 0, 0, canvas.width, canvas.height);
    const logoSize = 196;
    const padding = 24;
    const left = (canvas.width - logoSize) / 2;
    const top = (canvas.height - logoSize) / 2;
    context.fillStyle = link.qrBackground;
    context.fillRect(left - padding, top - padding, logoSize + padding * 2, logoSize + padding * 2);
    context.drawImage(logoImage, left, top, logoSize, logoSize);
    return canvas.toDataURL("image/png");
  } catch {
    onLogoError?.();
    return qr;
  }
}

export function downloadQrPng(dataUrl: string, code: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = `qr-${code}.png`;
  anchor.click();
}
