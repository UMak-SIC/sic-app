import { afterEach, expect, test, vi } from "vitest";

const { decodeFromConstraints } = vi.hoisted(() => ({ decodeFromConstraints: vi.fn() }));

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class {
    decodeFromConstraints = decodeFromConstraints;
  },
}));

import { startQrScan } from "@/lib/scanner/qr-scanner";

afterEach(() => vi.resetAllMocks());

type DecodeCallback = (result: { getText: () => string } | undefined) => void;

async function startScan(
  onDetected: (payload: string) => void,
  options?: Parameters<typeof startQrScan>[2],
) {
  const stop = vi.fn();
  let onResult: DecodeCallback | undefined;
  decodeFromConstraints.mockImplementation(async (_constraints, _video, callback) => {
    onResult = callback;
    return { stop };
  });
  const controls = await startQrScan({} as HTMLVideoElement, onDetected, options);
  return { stop, onResult, controls };
}

test("requests the rear camera and reports a decoded payload without stopping", async () => {
  const onDetected = vi.fn();
  const { stop, onResult, controls } = await startScan(onDetected);

  expect(decodeFromConstraints).toHaveBeenCalledWith(
    { audio: false, video: { facingMode: { ideal: "environment" } } },
    expect.anything(),
    expect.any(Function),
  );

  onResult?.({ getText: () => "opaque-signed-ticket" });

  expect(onDetected).toHaveBeenCalledWith("opaque-signed-ticket");
  // Scanning is continuous: the decode loop stays alive for the next attendee
  // and only the returned controls may stop it.
  expect(stop).not.toHaveBeenCalled();
  expect(controls.stop).toBeTypeOf("function");
});

test("honors a preferred facing mode when given", async () => {
  const onDetected = vi.fn();
  await startScan(onDetected, { facingMode: "user" });

  expect(decodeFromConstraints).toHaveBeenCalledWith(
    { audio: false, video: { facingMode: { ideal: "user" } } },
    expect.anything(),
    expect.any(Function),
  );
});

test("targets a specific device ID when given", async () => {
  const onDetected = vi.fn();
  await startScan(onDetected, { deviceId: "usb-camera-123" });

  expect(decodeFromConstraints).toHaveBeenCalledWith(
    { audio: false, video: { deviceId: { exact: "usb-camera-123" } } },
    expect.anything(),
    expect.any(Function),
  );
});

test("ignores the same payload while it is still within the cooldown", async () => {
  const onDetected = vi.fn();
  const { onResult } = await startScan(onDetected, { cooldownMs: 1000 });

  onResult?.({ getText: () => "same-ticket" });
  onResult?.({ getText: () => "same-ticket" });

  expect(onDetected).toHaveBeenCalledTimes(1);
});

test("reports a different payload immediately even during a cooldown", async () => {
  const onDetected = vi.fn();
  const { onResult } = await startScan(onDetected);

  onResult?.({ getText: () => "ticket-one" });
  onResult?.({ getText: () => "ticket-two" });

  expect(onDetected).toHaveBeenNthCalledWith(1, "ticket-one");
  expect(onDetected).toHaveBeenNthCalledWith(2, "ticket-two");
});

test("catches callback errors and keeps scanning loop active", async () => {
  const onDetected = vi.fn().mockImplementationOnce(() => {
    throw new Error("Consumer callback error");
  });
  const { stop, onResult, controls } = await startScan(onDetected);

  // Even if onDetected throws, startQrScan's callback does not throw into ZXing loop
  expect(() => onResult?.({ getText: () => "ticket-broken" })).not.toThrow();
  expect(onDetected).toHaveBeenCalledWith("ticket-broken");
  expect(stop).not.toHaveBeenCalled();

  // Subsequent detections still work cleanly
  onResult?.({ getText: () => "ticket-recovered" });
  expect(onDetected).toHaveBeenCalledWith("ticket-recovered");
  expect(controls.stop).toBeTypeOf("function");
});

test("supports continuous scanning across multiple distinct tickets without stopping", async () => {
  const onDetected = vi.fn();
  const { stop, onResult } = await startScan(onDetected);

  onResult?.({ getText: () => "attendee-1-ticket" });
  onResult?.({ getText: () => "attendee-2-ticket" });
  onResult?.({ getText: () => "attendee-3-ticket" });

  expect(onDetected).toHaveBeenCalledTimes(3);
  expect(onDetected).toHaveBeenNthCalledWith(1, "attendee-1-ticket");
  expect(onDetected).toHaveBeenNthCalledWith(2, "attendee-2-ticket");
  expect(onDetected).toHaveBeenNthCalledWith(3, "attendee-3-ticket");
  expect(stop).not.toHaveBeenCalled();
});
