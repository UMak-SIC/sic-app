-- An append-only audit log (DMA-14, SY-10).

-- 1. The table and the indexes behind the date-range and actor filters (SY-10.5).
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "actor_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "summary" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_log_occurred_at_idx" ON "audit_log"("occurred_at");

CREATE INDEX "audit_log_actor_email_occurred_at_idx" ON "audit_log"("actor_email", "occurred_at");

-- 2. Entries are read-only for every role (SY-10.4), so the database refuses changes
-- even if application code tries. The only deletion allowed is the five-year
-- retention job (SY-10.7), which opts in for its own transaction with
-- SET LOCAL app.audit_retention = 'on'. TRUNCATE does not fire row triggers, so the
-- test harness can still clear the table.
CREATE FUNCTION prevent_audit_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.audit_retention', true) = 'on' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

CREATE TRIGGER audit_log_no_update
BEFORE UPDATE ON "audit_log"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER audit_log_no_delete
BEFORE DELETE ON "audit_log"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
