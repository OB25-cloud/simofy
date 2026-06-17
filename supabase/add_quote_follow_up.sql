-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- sent_at is required alongside last_followed_up_at: without it there's no
-- way to know how long a quote has actually been sitting in 'sent' status
-- (created_at isn't reliable since a quote can sit as a draft for a while
-- before being sent). The Activity tab already had a "Quote sent to
-- client — Date not recorded" placeholder for exactly this gap.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_followed_up_at timestamptz;

-- Backfill sent_at for quotes that are already in 'sent' status, using
-- created_at as the best available proxy, so the follow-up flag works for
-- existing data instead of staying permanently blank for every quote sent
-- before this migration ran.
UPDATE quotes
SET sent_at = created_at
WHERE status = 'sent' AND sent_at IS NULL;
