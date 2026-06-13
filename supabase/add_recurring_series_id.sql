-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Add recurring_series_id column to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS recurring_series_id uuid;

-- 2. Index for efficient series lookups
CREATE INDEX IF NOT EXISTS jobs_recurring_series_id_idx
  ON jobs (recurring_series_id)
  WHERE recurring_series_id IS NOT NULL;
