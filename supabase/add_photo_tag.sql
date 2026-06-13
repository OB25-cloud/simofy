-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

ALTER TABLE job_photos
  ADD COLUMN IF NOT EXISTS tag text
  CONSTRAINT job_photos_tag_check CHECK (tag IN ('before', 'after'));
