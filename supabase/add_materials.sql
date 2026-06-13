-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Create materials catalogue table
CREATE TABLE IF NOT EXISTS materials (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  unit       text NOT NULL,
  unit_cost  numeric(10, 2) NOT NULL,
  category   text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS materials_name_unique ON materials (name);

-- 2. Seed 10 realistic NZ landscaping materials
INSERT INTO materials (name, unit, unit_cost, category) VALUES
  ('Garden Mulch',               'bag',  28.00, 'Mulch & Soil'),
  ('Premium Topsoil',            'bag',  45.00, 'Mulch & Soil'),
  ('Lawn Seed (Ryegrass Blend)', 'kg',   32.00, 'Seed & Turf'),
  ('Slow-Release Fertiliser',    'kg',   22.00, 'Fertiliser'),
  ('Weed & Feed Concentrate',    'L',    42.00, 'Chemicals'),
  ('Glyphosate Weedkiller',      'L',    18.50, 'Chemicals'),
  ('Bark Chip Mulch',            'bag',   8.50, 'Mulch & Soil'),
  ('Garden Compost',             'bag',  16.00, 'Mulch & Soil'),
  ('Mixed Native Plants',        'each', 12.00, 'Plants'),
  ('Petrol / Fuel',              'L',     2.95, 'Equipment')
ON CONFLICT (name) DO NOTHING;

-- 3. Create job_materials table
CREATE TABLE IF NOT EXISTS job_materials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  material_id uuid REFERENCES materials(id) NOT NULL,
  quantity    numeric(10, 3) NOT NULL DEFAULT 1,
  unit_cost   numeric(10, 2) NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- 4. RLS for materials
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select materials"
  ON materials FOR SELECT TO authenticated USING (true);

-- 5. RLS for job_materials
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert job materials"
  ON job_materials FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can select job materials"
  ON job_materials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete job materials"
  ON job_materials FOR DELETE TO authenticated USING (true);
