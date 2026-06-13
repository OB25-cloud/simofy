-- Demo seed data — run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: uses guards so nothing is double-inserted.

DO $$
DECLARE
  -- Up to 5 completed jobs
  v_job1 uuid; v_job2 uuid; v_job3 uuid; v_job4 uuid; v_job5 uuid;
  -- Up to 3 clients
  v_client1 uuid; v_client2 uuid; v_client3 uuid;
  -- Material IDs
  v_mulch    uuid; v_topsoil  uuid; v_seed   uuid;
  v_fert     uuid; v_weedfeed uuid; v_glypho uuid;
  v_bark     uuid; v_compost  uuid; v_plants uuid; v_fuel uuid;
BEGIN

  -- ── Grab existing record IDs ─────────────────────────────────────────────────

  SELECT id INTO v_job1 FROM jobs WHERE status = 'complete' ORDER BY scheduled_date DESC OFFSET 0 LIMIT 1;
  SELECT id INTO v_job2 FROM jobs WHERE status = 'complete' ORDER BY scheduled_date DESC OFFSET 1 LIMIT 1;
  SELECT id INTO v_job3 FROM jobs WHERE status = 'complete' ORDER BY scheduled_date DESC OFFSET 2 LIMIT 1;
  SELECT id INTO v_job4 FROM jobs WHERE status = 'complete' ORDER BY scheduled_date DESC OFFSET 3 LIMIT 1;
  SELECT id INTO v_job5 FROM jobs WHERE status = 'complete' ORDER BY scheduled_date DESC OFFSET 4 LIMIT 1;

  SELECT id INTO v_client1 FROM clients ORDER BY created_at OFFSET 0 LIMIT 1;
  SELECT id INTO v_client2 FROM clients ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_client3 FROM clients ORDER BY created_at OFFSET 2 LIMIT 1;

  SELECT id INTO v_mulch    FROM materials WHERE name = 'Garden Mulch';
  SELECT id INTO v_topsoil  FROM materials WHERE name = 'Premium Topsoil';
  SELECT id INTO v_seed     FROM materials WHERE name = 'Lawn Seed (Ryegrass Blend)';
  SELECT id INTO v_fert     FROM materials WHERE name = 'Slow-Release Fertiliser';
  SELECT id INTO v_weedfeed FROM materials WHERE name = 'Weed & Feed Concentrate';
  SELECT id INTO v_glypho   FROM materials WHERE name = 'Glyphosate Weedkiller';
  SELECT id INTO v_bark     FROM materials WHERE name = 'Bark Chip Mulch';
  SELECT id INTO v_compost  FROM materials WHERE name = 'Garden Compost';
  SELECT id INTO v_plants   FROM materials WHERE name = 'Mixed Native Plants';
  SELECT id INTO v_fuel     FROM materials WHERE name = 'Petrol / Fuel';

  -- ── 1. job_materials ─────────────────────────────────────────────────────────
  -- Only inserts for jobs that have no materials yet (avoids duplicates on re-run)

  IF v_job1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_materials WHERE job_id = v_job1) THEN
    INSERT INTO job_materials (job_id, material_id, quantity, unit_cost) VALUES
      (v_job1, v_mulch,   4, 28.00),   -- 4 bags Garden Mulch      = $112.00
      (v_job1, v_bark,    6,  8.50),   -- 6 bags Bark Chip Mulch   =  $51.00
      (v_job1, v_topsoil, 2, 45.00);   -- 2 bags Premium Topsoil   =  $90.00
  END IF;

  IF v_job2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_materials WHERE job_id = v_job2) THEN
    INSERT INTO job_materials (job_id, material_id, quantity, unit_cost) VALUES
      (v_job2, v_seed,     3, 32.00),  -- 3 kg  Lawn Seed           =  $96.00
      (v_job2, v_fert,     2, 22.00),  -- 2 kg  Slow-Release Fert.  =  $44.00
      (v_job2, v_weedfeed, 1, 42.00);  -- 1 L   Weed & Feed         =  $42.00
  END IF;

  IF v_job3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_materials WHERE job_id = v_job3) THEN
    INSERT INTO job_materials (job_id, material_id, quantity, unit_cost) VALUES
      (v_job3, v_plants,  8, 12.00),   -- 8 ea  Mixed Native Plants = $96.00
      (v_job3, v_compost, 4, 16.00),   -- 4 bags Garden Compost     = $64.00
      (v_job3, v_glypho,  2, 18.50);   -- 2 L   Glyphosate          = $37.00
  END IF;

  IF v_job4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_materials WHERE job_id = v_job4) THEN
    INSERT INTO job_materials (job_id, material_id, quantity, unit_cost) VALUES
      (v_job4, v_fuel,  15, 2.95),     -- 15 L  Petrol/Fuel         = $44.25
      (v_job4, v_mulch,  3, 28.00);    -- 3 bags Garden Mulch       = $84.00
  END IF;

  IF v_job5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_materials WHERE job_id = v_job5) THEN
    INSERT INTO job_materials (job_id, material_id, quantity, unit_cost) VALUES
      (v_job5, v_topsoil, 5, 45.00),   -- 5 bags Premium Topsoil   = $225.00
      (v_job5, v_seed,    2, 32.00),   -- 2 kg  Lawn Seed           =  $64.00
      (v_job5, v_compost, 3, 16.00);   -- 3 bags Garden Compost     =  $48.00
  END IF;

  -- ── 2. Invoices ──────────────────────────────────────────────────────────────
  -- NZ GST-inclusive: amount = ex-GST, tax = 15%, total = inc-GST

  IF v_client1 IS NOT NULL THEN
    INSERT INTO invoices (client_id, amount, tax, total, status, due_date, notes) VALUES
      (v_client1, 739.13,  110.87,  850.00, 'paid',
       (CURRENT_DATE - INTERVAL '25 days')::date,
       'Lawn mow, edge, and blowdown. Payment received via bank transfer.'),
      (v_client1, 1043.48, 156.52, 1200.00, 'paid',
       (CURRENT_DATE - INTERVAL '42 days')::date,
       'Full garden tidy, pruning hedges and rose beds.'),
      (v_client1, 1608.70, 241.30, 1850.00, 'overdue',
       (CURRENT_DATE - INTERVAL '10 days')::date,
       'Mulching and topsoil refresh — front and rear garden beds.');
  END IF;

  IF v_client2 IS NOT NULL THEN
    INSERT INTO invoices (client_id, amount, tax, total, status, due_date, notes) VALUES
      (v_client2, 565.22,  84.78,   650.00, 'paid',
       (CURRENT_DATE - INTERVAL '58 days')::date,
       'Weed spray and lawn feed application.'),
      (v_client2, 2086.96, 313.04, 2400.00, 'sent',
       (CURRENT_DATE + INTERVAL '7 days')::date,
       'Native planting project — 3 raised beds along fence line.'),
      (v_client2, 652.17,  97.83,   750.00, 'overdue',
       (CURRENT_DATE - INTERVAL '6 days')::date,
       'Fortnightly maintenance visit x3.');
  END IF;

  IF v_client3 IS NOT NULL THEN
    INSERT INTO invoices (client_id, amount, tax, total, status, due_date, notes) VALUES
      (v_client3, 782.61, 117.39, 900.00, 'sent',
       (CURRENT_DATE + INTERVAL '14 days')::date,
       'Lawn renovation — scarify, overseed, and first fertiliser application.');
  END IF;

  -- ── 3. job_photos (before / after) ───────────────────────────────────────────
  -- Using picsum.photos seeds for consistent, distinct images

  IF v_job1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_photos WHERE job_id = v_job1) THEN
    INSERT INTO job_photos (job_id, url, tag) VALUES
      (v_job1, 'https://picsum.photos/seed/garden-before-1/800/600', 'before'),
      (v_job1, 'https://picsum.photos/seed/garden-after-1/800/600',  'after'),
      (v_job1, 'https://picsum.photos/seed/garden-after-2/800/600',  'after');
  END IF;

  IF v_job2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_photos WHERE job_id = v_job2) THEN
    INSERT INTO job_photos (job_id, url, tag) VALUES
      (v_job2, 'https://picsum.photos/seed/lawn-before-1/800/600',  'before'),
      (v_job2, 'https://picsum.photos/seed/lawn-before-2/800/600',  'before'),
      (v_job2, 'https://picsum.photos/seed/lawn-after-1/800/600',   'after');
  END IF;

  IF v_job3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_photos WHERE job_id = v_job3) THEN
    INSERT INTO job_photos (job_id, url, tag) VALUES
      (v_job3, 'https://picsum.photos/seed/native-before-1/800/600', 'before'),
      (v_job3, 'https://picsum.photos/seed/native-after-1/800/600',  'after'),
      (v_job3, 'https://picsum.photos/seed/native-after-2/800/600',  'after');
  END IF;

  -- ── 4. Leads ─────────────────────────────────────────────────────────────────

  INSERT INTO leads (name, email, phone, message, source, status, notes)
  SELECT 'Mark Thompson', 'mark.thompson@gmail.com', '021 456 7890',
    'Hi, looking for someone to do a full garden makeover. Large section with overgrown beds and lawns that need re-seeding. Happy to discuss budget — can you come out for a free quote?',
    'website', 'new', NULL
  WHERE NOT EXISTS (SELECT 1 FROM leads WHERE email = 'mark.thompson@gmail.com');

  INSERT INTO leads (name, email, phone, message, source, status, notes)
  SELECT 'Sarah Whitfield', 'sarah.whitfield@xtra.co.nz', '027 333 5541',
    'After a regular fortnightly lawn mow and garden tidy. Property in Remuera, about 600sqm section. Please get in touch to arrange a visit.',
    'referral', 'contacted', 'Called 12 June — leaving message. Try again Thursday.'
  WHERE NOT EXISTS (SELECT 1 FROM leads WHERE email = 'sarah.whitfield@xtra.co.nz');

  INSERT INTO leads (name, email, phone, message, source, status, notes)
  SELECT 'Coastal Property Management', 'admin@coastalpm.co.nz', '09 421 6600',
    'We manage several rental properties across the North Shore and need a reliable landscaping contractor for ongoing maintenance. Please send through your rates and availability.',
    'google', 'quoted', 'Sent quote 10 June for 4 properties. Following up next week.'
  WHERE NOT EXISTS (SELECT 1 FROM leads WHERE email = 'admin@coastalpm.co.nz');

  -- ── 5. job_notes ─────────────────────────────────────────────────────────────

  IF v_job1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_notes WHERE job_id = v_job1) THEN
    INSERT INTO job_notes (job_id, content, created_at) VALUES
      (v_job1, 'Client requested extra trim around fence line on the northern boundary — took an additional 30 mins.',
       now() - INTERVAL '5 days'),
      (v_job1, 'Gate code is 4521. Side gate can be stiff — lift the handle while pushing.',
       now() - INTERVAL '5 days' + INTERVAL '10 minutes');
  END IF;

  IF v_job2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_notes WHERE job_id = v_job2) THEN
    INSERT INTO job_notes (job_id, content, created_at) VALUES
      (v_job2, 'Lawn looking patchy in the south-facing corner — applied extra seed and covered with straw. Recommend a follow-up in 3 weeks to check germination.',
       now() - INTERVAL '12 days'),
      (v_job2, 'Reminded client to water daily for 2 weeks. Left printed care instructions in letterbox.',
       now() - INTERVAL '12 days' + INTERVAL '5 minutes');
  END IF;

  IF v_job3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_notes WHERE job_id = v_job3) THEN
    INSERT INTO job_notes (job_id, content, created_at) VALUES
      (v_job3, 'Two of the native plants were slightly root-bound from the nursery — loosened roots before planting. Should establish fine.',
       now() - INTERVAL '18 days'),
      (v_job3, 'Dog on site. Client keeps it inside while we work but needs a 10-min heads-up call before we arrive.',
       now() - INTERVAL '18 days' + INTERVAL '8 minutes');
  END IF;

  IF v_job4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_notes WHERE job_id = v_job4) THEN
    INSERT INTO job_notes (job_id, content, created_at) VALUES
      (v_job4, 'Mower blade needed sharpening mid-job — done on site. Added to equipment maintenance log.',
       now() - INTERVAL '22 days');
  END IF;

  IF v_job5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_notes WHERE job_id = v_job5) THEN
    INSERT INTO job_notes (job_id, content, created_at) VALUES
      (v_job5, 'Client wants to expand the back lawn area next visit — measure up and prepare a quote for turf laying approx 40sqm.',
       now() - INTERVAL '30 days');
  END IF;

END $$;
