import * as React from "react";
import { expect, test, vi } from "vitest";

import { DeleteQrLinkDialog } from "@/components/qr/delete-qr-link-dialog";

const link = {
  id: "link-1",
  code: "AbCdEfG",
  name: "SIC Student Handbook",
  destination: "https://example.com/handbook",
  viewCount: 42,
  status: "ACTIVE" as const,
  expiresAt: null,
  qrForeground: "#12333A",
  qrBackground: "#FFFFFF",
  qrLogoAssetId: null,
  qrLogoUrl: null,
  createdAt: "2026-10-15T08:00:00.000Z",
  updatedAt: "2026-10-15T08:30:00.000Z",
  totalVisits: 42,
};

test("renders the DeleteQrLinkDialog component structure with link details", () => {
  const el = DeleteQrLinkDialog({
    open: true,
    onOpenChange: vi.fn(),
    link,
    isDeleting: false,
    onConfirm: vi.fn(),
  });

  expect(React.isValidElement(el)).toBe(true);
  expect(el?.props.open).toBe(true);

  // Content children inside Dialog
  const content = el?.props.children;
  expect(React.isValidElement(content)).toBe(true);

  const serialized = JSON.stringify(content);
  expect(serialized).toContain("Delete QR link?");
  expect(serialized).toContain("SIC Student Handbook");
  expect(serialized).toContain("https://example.com/handbook");
  expect(serialized).toContain("Delete link");
});

test("shows loading label when deletion is in progress", () => {
  const el = DeleteQrLinkDialog({
    open: true,
    onOpenChange: vi.fn(),
    link,
    isDeleting: true,
    onConfirm: vi.fn(),
  });

  const serialized = JSON.stringify(el?.props.children);
  expect(serialized).toContain("Deleting...");
});

test("renders null when link is null", () => {
  const el = DeleteQrLinkDialog({
    open: true,
    onOpenChange: vi.fn(),
    link: null,
    isDeleting: false,
    onConfirm: vi.fn(),
  });

  expect(el).toBeNull();
});
