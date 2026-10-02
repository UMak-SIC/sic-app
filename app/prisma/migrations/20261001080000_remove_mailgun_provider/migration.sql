-- Keep existing delivery history valid while consolidating the application on Brevo.
UPDATE "email_deliveries" SET "provider" = 'brevo' WHERE "provider" = 'mailgun';
UPDATE "delivery_attempts" SET "provider" = 'brevo' WHERE "provider" = 'mailgun';
UPDATE "provider_daily_usage" SET "provider" = 'brevo' WHERE "provider" = 'mailgun';

ALTER TYPE "EmailProvider" RENAME TO "EmailProvider_old";
CREATE TYPE "EmailProvider" AS ENUM ('brevo');

ALTER TABLE "email_deliveries"
  ALTER COLUMN "provider" TYPE "EmailProvider" USING "provider"::text::"EmailProvider";
ALTER TABLE "delivery_attempts"
  ALTER COLUMN "provider" TYPE "EmailProvider" USING "provider"::text::"EmailProvider";
ALTER TABLE "provider_daily_usage"
  ALTER COLUMN "provider" TYPE "EmailProvider" USING "provider"::text::"EmailProvider";

DROP TYPE "EmailProvider_old";
