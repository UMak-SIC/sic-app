import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

const requiredEnvironment = [
  "DATABASE_URL",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_ENDPOINT_URL_S3",
  "AWS_REGION",
];
const missing = requiredEnvironment.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});
const storage = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  region: process.env.AWS_REGION,
});

async function existsInBucket(bucket, key) {
  try {
    await storage.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) {
      return false;
    }

    throw error;
  }
}

try {
  const assets = await prisma.asset.findMany({
    where: { storageBucket: null },
    select: { id: true, objectKey: true },
  });

  for (const asset of assets) {
    const [privateImage, publicImage] = await Promise.all([
      existsInBucket("private-images", asset.objectKey),
      existsInBucket("public-images", asset.objectKey),
    ]);

    if (privateImage === publicImage) {
      throw new Error(
        `Could not determine exactly one bucket for asset ${asset.id} (${asset.objectKey}).`,
      );
    }

    await prisma.asset.updateMany({
      where: { id: asset.id, storageBucket: null },
      data: { storageBucket: privateImage ? "PRIVATE_IMAGES" : "PUBLIC_IMAGES" },
    });
  }

  console.log(`Verified and backfilled ${assets.length} asset bucket records.`);
} finally {
  await prisma.$disconnect();
}
