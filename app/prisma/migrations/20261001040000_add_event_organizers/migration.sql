CREATE TABLE "event_organizers" (
    "event_id" UUID NOT NULL,
    "attendee_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_organizers_pkey" PRIMARY KEY ("event_id", "attendee_id")
);

CREATE INDEX "event_organizers_attendee_id_idx" ON "event_organizers"("attendee_id");

ALTER TABLE "event_organizers"
  ADD CONSTRAINT "event_organizers_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_organizers"
  ADD CONSTRAINT "event_organizers_attendee_id_fkey"
  FOREIGN KEY ("attendee_id") REFERENCES "attendees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
