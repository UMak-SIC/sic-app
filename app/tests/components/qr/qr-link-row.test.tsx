import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { QrLinkRow } from "@/components/qr/qr-link-row";

const link = {
  id: "link-id",
  code: "AbCdEfG",
  name: "SIC handbook",
  destination: "https://example.com/handbook",
  viewCount: 12,
  status: "ACTIVE" as const,
  expiresAt: null,
  qrForeground: "#12333A",
  qrBackground: "#FFFFFF",
  qrLogoAssetId: null,
  qrLogoUrl: null,
  createdAt: "2026-10-15T08:00:00.000Z",
  updatedAt: "2026-10-15T08:30:00.000Z",
};

test("shows the operator-facing link status, destination, and scan count", () => {
  const html = renderToStaticMarkup(
    <QrLinkRow
      link={link}
      busy={false}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      onPreview={vi.fn()}
      onToggleStatus={vi.fn()}
    />,
  );

  expect(html).toContain("SIC handbook");
  expect(html).toContain("https://example.com/handbook");
  expect(html).toContain("12 scans");
  expect(html).toContain("Active");
  expect(html).toContain("Pause link");
  expect(html).toContain("Preview QR");
});

test("labels expired links without offering a misleading pause action", () => {
  const html = renderToStaticMarkup(
    <QrLinkRow
      link={{ ...link, expiresAt: "2026-10-14T08:00:00.000Z" }}
      busy={false}
      now={new Date("2026-10-15T08:00:00.000Z")}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      onPreview={vi.fn()}
      onToggleStatus={vi.fn()}
    />,
  );

  expect(html).toContain("Expired");
  expect(html).not.toContain("Pause link");
});

test("keeps a disabled link paused even when its expiry has passed, so it can be resumed", () => {
  const html = renderToStaticMarkup(
    <QrLinkRow
      link={{ ...link, status: "DISABLED", expiresAt: "2026-10-14T08:00:00.000Z" }}
      busy={false}
      now={new Date("2026-10-15T08:00:00.000Z")}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      onPreview={vi.fn()}
      onToggleStatus={vi.fn()}
    />,
  );

  expect(html).toContain("Paused");
  expect(html).toContain("Resume link");
  expect(html).not.toContain("Expired");
});
