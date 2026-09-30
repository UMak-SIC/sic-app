import { afterEach, expect, test, vi } from "vitest";

const { decodeFromConstraints } = vi.hoisted(() => ({ decodeFromConstraints: vi.fn() }));

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class {
    decodeFromConstraints = decodeFromConstraints;
  },
}));

import { startQrScan } from "@/lib/scanner/qr-scanner";

afterEach(() => vi.resetAllMocks());

test("requests the rear camera and returns the opaque QR payload once decoded", async () => {
  const stop = vi.fn();
  let onResult: ((result: { getText: () => string } | undefined) => void) | undefined;
  decodeFromConstraints.mockImplementation(async (_constraints, _video, callback) => {
    onResult = callback;
    return { stop };
  });
  const onDetected = vi.fn();

  await startQrScan({} as HTMLVideoElement, onDetected);
  onResult?.({ getText: () => "opaque-signed-ticket" });

  expect(decodeFromConstraints).toHaveBeenCalledWith(
    { audio: false, video: { facingMode: { ideal: "environment" } } },
    expect.anything(),
    expect.any(Function),
  );
  expect(stop).toHaveBeenCalledOnce();
  expect(onDetected).toHaveBeenCalledWith("opaque-signed-ticket");
});
