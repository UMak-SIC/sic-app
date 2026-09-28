import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

let neonStorageClient: S3Client | undefined;

function requiredStorageEnvironment(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to initialize Neon Object Storage.`);
  }

  return value;
}

// Neon Object Storage only accepts path-style S3 requests. Construct it only
// when handling storage work so route discovery does not require deployment secrets.
export function getNeonStorageClient(): S3Client {
  neonStorageClient ??= new S3Client({
    credentials: {
      accessKeyId: requiredStorageEnvironment("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requiredStorageEnvironment("AWS_SECRET_ACCESS_KEY"),
    },
    endpoint: requiredStorageEnvironment("AWS_ENDPOINT_URL_S3"),
    forcePathStyle: true,
    region: requiredStorageEnvironment("AWS_REGION"),
  });

  return neonStorageClient;
}
