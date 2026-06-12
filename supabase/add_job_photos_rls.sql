-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. RLS policies for the job-photos Storage bucket (storage.objects)
--    Allows any authenticated user to upload, view, and delete photos.

INSERT INTO storage.buckets (id, name, public)
  VALUES ('job-photos', 'job-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload job photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-photos');

CREATE POLICY "Authenticated users can view job photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'job-photos');

CREATE POLICY "Authenticated users can delete job photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-photos');

-- 2. RLS policies for the job_photos table

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert job photos"
  ON job_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can select job photos"
  ON job_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete job photos"
  ON job_photos FOR DELETE
  TO authenticated
  USING (true);
