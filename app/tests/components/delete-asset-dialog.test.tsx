import * as React from "react";
import { expect, test, vi } from "vitest";

import { DeleteAssetDialog } from "@/components/assets/delete-asset-dialog";
import type { AssetItem } from "@/components/assets/asset-types";

const mockAsset: AssetItem = {
  id: "asset-1",
  objectKey: "events/cover.png",
  originalFilename: "summit-banner.png",
  mediaType: "image/png",
  byteSize: 1024 * 512,
  uploadedAt: "Oct 15, 2026, 8:00 AM",
  url: "https://example.com/asset.png",
  format: "png",
  category: "image",
  fileSizeFormatted: "512 KB",
  uploadedBy: "Administrator",
  downloadCount: 0,
  references: [],
};

test("renders DeleteAssetDialog element tree with file details", () => {
  const el = DeleteAssetDialog({
    open: true,
    onOpenChange: vi.fn(),
    asset: mockAsset,
    isDeleting: false,
    onConfirm: vi.fn(),
  });

  expect(React.isValidElement(el)).toBe(true);
  expect(el?.props.open).toBe(true);

  const content = el?.props.children;
  expect(React.isValidElement(content)).toBe(true);

  const serialized = JSON.stringify(content);
  expect(serialized).toContain("Delete file?");
  expect(serialized).toContain("summit-banner.png");
  expect(serialized).toContain("512 KB");
  expect(serialized).toContain("Delete file");
});

test("shows loading label when deletion is in progress", () => {
  const el = DeleteAssetDialog({
    open: true,
    onOpenChange: vi.fn(),
    asset: mockAsset,
    isDeleting: true,
    onConfirm: vi.fn(),
  });

  const serialized = JSON.stringify(el?.props.children);
  expect(serialized).toContain("Deleting...");
});

test("renders null when asset is null", () => {
  const el = DeleteAssetDialog({
    open: true,
    onOpenChange: vi.fn(),
    asset: null,
    isDeleting: false,
    onConfirm: vi.fn(),
  });

  expect(el).toBeNull();
});
