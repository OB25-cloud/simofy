-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Add review_request_delay_hours to notification_defaults
ALTER TABLE notification_defaults
  ADD COLUMN IF NOT EXISTS review_request_delay_hours integer NOT NULL DEFAULT 24;

-- 2. Notifications queue table
CREATE TABLE IF NOT EXISTS notifications (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  job_id            uuid        REFERENCES jobs(id) ON DELETE SET NULL,
  notification_type text        NOT NULL,
  scheduled_for     timestamptz NOT NULL,
  status            text        NOT NULL DEFAULT 'queued',
  review_link       text        NOT NULL DEFAULT 'https://g.page/r/PLACEHOLDER/review',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_client_id
  ON notifications(client_id);

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for
  ON notifications(scheduled_for) WHERE status = 'queued';
