-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS start_time time DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS end_time   time DEFAULT '10:00';
