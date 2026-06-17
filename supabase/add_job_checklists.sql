-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Checklist templates (reusable, admin-managed)
CREATE TABLE IF NOT EXISTS checklist_templates (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Items belonging to a template
CREATE TABLE IF NOT EXISTS checklist_template_items (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid    NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  item_text   text    NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  required    boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_checklist_template_items_template_id
  ON checklist_template_items(template_id);

-- 3. Track which template (if any) is assigned to a job
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS checklist_template_id uuid REFERENCES checklist_templates(id) ON DELETE SET NULL;

-- 4. Per-job checklist items, copied from the template at assignment time.
-- item_text and required are denormalized (not just looked up via
-- template_item_id) so later edits or deletion of the template don't change
-- what was already assigned to a job. sort_order preserves display order
-- since rows are bulk-inserted at assignment time and created_at alone
-- isn't reliable for ordering ties.
CREATE TABLE IF NOT EXISTS job_checklist_items (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id           uuid        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  template_item_id uuid        REFERENCES checklist_template_items(id) ON DELETE SET NULL,
  item_text        text        NOT NULL,
  required         boolean     NOT NULL DEFAULT false,
  completed        boolean     NOT NULL DEFAULT false,
  completed_by     text,
  completed_at     timestamptz,
  sort_order       integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_checklist_items_job_id
  ON job_checklist_items(job_id);
