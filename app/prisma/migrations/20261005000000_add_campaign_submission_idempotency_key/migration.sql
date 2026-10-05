ALTER TABLE "campaigns"
ADD COLUMN "idempotency_key" TEXT;

UPDATE "campaigns"
SET "idempotency_key" = id::text
WHERE "idempotency_key" IS NULL;

ALTER TABLE "campaigns"
ALTER COLUMN "idempotency_key" SET NOT NULL;

CREATE UNIQUE INDEX "campaigns_idempotency_key_key"
ON "campaigns"("idempotency_key");
