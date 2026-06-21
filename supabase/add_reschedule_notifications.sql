-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Needed for: Schedule page drag-and-drop rescheduling notifications.

-- 1. Distinguish who a queued notification is for ('client' or 'staff').
--    Existing rows are all client-facing, so default them to 'client'.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS recipient text NOT NULL DEFAULT 'client';

-- 2. A reschedule notification for staff has no client recipient, so
--    client_id needs to be nullable (it stays required for client rows).
ALTER TABLE notifications
  ALTER COLUMN client_id DROP NOT NULL;

-- 3. Allow 'reschedule' as a notification type.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('confirmation', 'reminder', 'arrival', 'completion', 'review_request', 'invoice', 'reschedule'));
