-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
--
-- The purchase_orders table already exists with columns: id, job_id, supplier,
-- description, amount, status, receipt_url, xero_expense_id, created_at — and a
-- status check constraint already restricting to pending/approved/received/cancelled.
-- The ADD COLUMN statements below are a no-op safety net in case this is run
-- against an environment where the table is missing any of them.

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier     text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS description  text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS amount       numeric(10, 2);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS status       text DEFAULT 'pending';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS receipt_url  text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS job_id       uuid REFERENCES jobs(id) ON DELETE CASCADE;

-- 1. RLS — purchase_orders currently has no RLS enabled (anon key can select/
--    insert/delete freely). Bring it in line with job_photos/job_materials/
--    job_notes, which all restrict access to authenticated users only.
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select purchase orders"
  ON purchase_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert purchase orders"
  ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase orders"
  ON purchase_orders FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete purchase orders"
  ON purchase_orders FOR DELETE TO authenticated USING (true);

-- 2. Storage bucket + RLS for purchase order receipt photos (same pattern as
--    the job-photos bucket in add_job_photos_rls.sql).
INSERT INTO storage.buckets (id, name, public)
  VALUES ('po-receipts', 'po-receipts', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload PO receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'po-receipts');

CREATE POLICY "Authenticated users can view PO receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'po-receipts');

CREATE POLICY "Authenticated users can delete PO receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'po-receipts');
