-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Add completed_date column to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS completed_date timestamptz;

-- 2. Create job_notes table
CREATE TABLE IF NOT EXISTS job_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  content     text NOT NULL,
  created_by  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- 3. RLS for job_notes
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert job notes"
  ON job_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can select job notes"
  ON job_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete job notes"
  ON job_notes FOR DELETE
  TO authenticated
  USING (true);
