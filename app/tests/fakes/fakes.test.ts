import { PutObjectCommand } from "@aws-sdk/client-s3";
import { expect, test } from "vitest";

import {
  createFakeNeonAuth,
  fakeAdminSession,
  RecordingBrevoFake,
  RecordingMailgunFake,
  RecordingObjectStorageFake,
} from ".";

test("creates deterministic fake Neon Auth sessions", async () => {
  await expect(createFakeNeonAuth(fakeAdminSession()).getSession()).resolves.toEqual({
    data: { user: { id: "admin-id" } },
  });
  await expect(createFakeNeonAuth(null).getSession()).resolves.toEqual({ data: null });
});

test("records deterministic email and storage provider calls", async () => {
  const mailgun = new RecordingMailgunFake();
  const brevo = new RecordingBrevoFake();
  const storage = new RecordingObjectStorageFake();
  const message = { html: "<p>Test</p>", subject: "Test", to: "student@example.com" };

  await expect(mailgun.send(message)).resolves.toEqual({ id: "mailgun-1" });
  await expect(brevo.send(message)).resolves.toEqual({ id: "brevo-1" });
  await storage.send(new PutObjectCommand({ Bucket: "private-images", Key: "assets/test.webp" }));

  expect(mailgun.messages).toEqual([message]);
  expect(brevo.messages).toEqual([message]);
  expect(storage.commands).toHaveLength(1);
});
