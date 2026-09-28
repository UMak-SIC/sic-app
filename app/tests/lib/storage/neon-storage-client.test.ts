import { afterEach, expect, test, vi } from "vitest";

const storageEnvironment = {
  AWS_ACCESS_KEY_ID: "test-access-key",
  AWS_SECRET_ACCESS_KEY: "test-secret-key",
  AWS_ENDPOINT_URL_S3: "https://storage.example.neon.tech",
  AWS_REGION: "ap-southeast-1",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test("uses the Neon endpoint, credentials, region, and path-style requests", async () => {
  for (const [name, value] of Object.entries(storageEnvironment)) {
    vi.stubEnv(name, value);
  }

  const { neonStorageClient } = await import("@/lib/storage/neon-storage-client");
  const credentials = await neonStorageClient.config.credentials();
  const resolveEndpoint = neonStorageClient.config.endpoint;

  if (!resolveEndpoint) {
    throw new Error("Neon Object Storage endpoint is not configured.");
  }

  const endpoint = await resolveEndpoint();

  expect(neonStorageClient.config.forcePathStyle).toBe(true);
  expect(await neonStorageClient.config.region()).toBe(storageEnvironment.AWS_REGION);
  expect(credentials).toMatchObject({
    accessKeyId: storageEnvironment.AWS_ACCESS_KEY_ID,
    secretAccessKey: storageEnvironment.AWS_SECRET_ACCESS_KEY,
  });
  expect(endpoint).toMatchObject({
    hostname: "storage.example.neon.tech",
    path: "/",
    protocol: "https:",
  });
});
