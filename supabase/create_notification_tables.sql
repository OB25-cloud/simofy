-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Per-client notification preferences
CREATE TABLE IF NOT EXISTS client_notification_settings (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  notification_type text      NOT NULL,
  enabled         boolean     NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_cns_client_id
  ON client_notification_settings(client_id);

-- 2. Global defaults (one row per notification type)
CREATE TABLE IF NOT EXISTS notification_defaults (
  notification_type text        PRIMARY KEY,
  enabled           boolean     NOT NULL DEFAULT true,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Seed defaults (all enabled)
INSERT INTO notification_defaults (notification_type, enabled) VALUES
  ('job_confirmation',    true),
  ('day_before_reminder', true),
  ('job_completion',      true),
  ('invoice_overdue',     true),
  ('review_request',      true)
ON CONFLICT (notification_type) DO NOTHING;
