// Demo seed script for "Green & Co Landscaping" — Wellington, NZ.
//
// Adds realistic demo data ALONGSIDE whatever is already in the database.
// Nothing is deleted or overwritten. Safe to run against a database that
// already has real or other demo data in it.
//
// Usage:
//   node scripts/seed-demo.js
//
// Requires .env.local to contain NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY (the service role key is required — several
// tables in this schema have RLS policies that only allow the
// `authenticated` Postgres role to write, which the anon key can't satisfy
// from a standalone Node script with no logged-in session).

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// ── Load .env.local (this is a plain Node script, not a Next.js request,
//    so Next's automatic env loading doesn't apply here) ────────────────────
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── date helpers ─────────────────────────────────────────────────────────────
// scheduled_date / due_date / paid_date / valid_until are `date` columns;
// created_at / sent_at are `timestamptz` columns.

const NOW = new Date()

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
function toDateOnly(d) {
  return d.toISOString().split('T')[0]
}
// Offset in days from now — positive = future, negative = past.
function dateOnly(offsetDays) {
  return toDateOnly(addDays(NOW, offsetDays))
}
function timestamp(offsetDays) {
  return addDays(NOW, offsetDays).toISOString()
}

async function insertBatch(table, rows, label) {
  const { data, error } = await supabase.from(table).insert(rows).select()
  if (error) {
    console.error(`\n✗ Failed inserting ${label ?? table}:`, error.message)
    process.exit(1)
  }
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

const CLIENTS = [
  { name: 'Grace Tuiloma', business_name: null, email: 'grace.tuiloma@gmail.com', phone: '021 445 2201', address: '14 Wadestown Road, Wadestown, Wellington', notes: 'Fortnightly lawn mow. Prefers Tuesday visits.', is_active: true },
  { name: "Daniel O'Connor", business_name: null, email: 'daniel.oconnor@xtra.co.nz', phone: '027 812 3345', address: '8 Ohiro Road, Brooklyn, Wellington', notes: null, is_active: true },
  { name: 'Aroha Ngata', business_name: null, email: 'aroha.ngata@hotmail.com', phone: '022 390 1187', address: '22 Miramar Avenue, Miramar, Wellington', notes: null, is_active: true },
  { name: 'Trevor Hale', business_name: 'Wellington Central Apartments Body Corp', email: 'trevor.hale@outlook.com', phone: '04 385 2210', address: '101 Willis Street, Te Aro, Wellington', notes: 'Shared courtyard + planter boxes, monthly service.', is_active: true },
  { name: 'Liam Fitzgerald', business_name: null, email: 'liam.fitzgerald@gmail.com', phone: '021 664 9982', address: '5 Melling Road, Lower Hutt', notes: null, is_active: true },
  { name: 'Priya Patel', business_name: null, email: 'priya.patel@xtra.co.nz', phone: '027 556 1120', address: '19 Discovery Drive, Whitby, Porirua', notes: null, is_active: true },
  { name: 'Susan Meyer', business_name: 'Hutt Valley Medical Centre', email: 'admin@huttvalleymedical.co.nz', phone: '04 566 7788', address: '45 High Street, Lower Hutt', notes: 'Access via rear car park only, weekdays before 8am.', is_active: true },
  { name: 'Sam Ropata', business_name: null, email: 'sam.ropata@hotmail.com', phone: '022 118 4456', address: '3 Constable Street, Newtown, Wellington', notes: null, is_active: true },
  { name: 'Emma Sullivan', business_name: null, email: 'emma.sullivan@gmail.com', phone: '021 774 3390', address: '31 Broderick Road, Johnsonville, Wellington', notes: null, is_active: true },
  { name: 'Graeme Wilkins', business_name: 'Cashmere Rest Home', email: 'facilities@cashmererest.co.nz', phone: '04 479 2200', address: '12 Cashmere Avenue, Khandallah, Wellington', notes: 'Weekly grounds maintenance contract — quiet hours 1–3pm.', is_active: true },
]

// ─────────────────────────────────────────────────────────────────────────────
// 1b. SITES — one per client, holding their actual Wellington-area address.
//
//    jobs.location turns out to be a strict check-constraint enum in this
//    schema — only 'Queenstown' / 'Wanaka' / 'Cromwell' (the app's real
//    Central Otago base) or null pass. It's not a free-text field, so it
//    can't hold a Wellington address. The app already expects the real
//    per-job address to live on `sites` instead (MapView falls back to
//    `job.sites?.address` whenever `job.location` is empty) — every job
//    below is linked to its client's site via site_id, with location left
//    null, matching how the app's own existing data does it.
// ─────────────────────────────────────────────────────────────────────────────

const SITES = CLIENTS.map(c => ({ address: c.address, location: null, access_notes: null, hazard_notes: null }))

// ─────────────────────────────────────────────────────────────────────────────
// 2. STAFF
// ─────────────────────────────────────────────────────────────────────────────

const STAFF = [
  { name: 'Craig Anderson', email: 'craig@greenandco.co.nz', phone: '021 555 0101', role: 'admin', pay_rate: 95, is_active: true },
  { name: 'Michelle Baker', email: 'michelle@greenandco.co.nz', phone: '021 555 0102', role: 'admin', pay_rate: 65, is_active: true },
  { name: 'Tama Wilson', email: 'tama@greenandco.co.nz', phone: '022 610 4471', role: 'field', pay_rate: 32, is_active: true },
  { name: 'Josh Campbell', email: 'josh@greenandco.co.nz', phone: '027 448 9021', role: 'field', pay_rate: 30, is_active: true },
  { name: 'Ben Harrison', email: 'ben@greenandco.co.nz', phone: '021 339 6612', role: 'field', pay_rate: 35, is_active: true },
  { name: 'Ricky Ngata', email: 'ricky@greenandco.co.nz', phone: '022 774 3305', role: 'field', pay_rate: 28, is_active: true },
  { name: 'Dave Thompson', email: 'dave@greenandco.co.nz', phone: '021 887 1150', role: 'field', pay_rate: 45, is_active: true },
  { name: 'Manaia Wetere', email: 'manaia@greenandco.co.nz', phone: '027 220 6689', role: 'field', pay_rate: 34, is_active: true },
]

// ─────────────────────────────────────────────────────────────────────────────
// 3. LEADS — spread across the last 3 months
// ─────────────────────────────────────────────────────────────────────────────

const LEADS = [
  { name: 'Rachel Kingi', email: 'rachel.kingi@gmail.com', phone: '021 340 8871', message: 'Hi, looking for a quote on a fortnightly lawn mow for our Karori property. Roughly 400sqm section.', source: 'Website', status: 'new', notes: null, daysAgo: 4 },
  { name: 'Peter Novak', email: 'peter.novak@xtra.co.nz', phone: '027 665 1123', message: 'Our front hedge along the street has gotten completely out of control. Need someone to trim it back hard and tidy up. Whitby, Porirua.', source: 'Google', status: 'new', notes: null, daysAgo: 9 },
  { name: 'Louise Chan', email: 'louise.chan@hotmail.com', phone: '022 981 4456', message: "After a full garden tidy before summer — beds are full of weeds and the lawn needs a good mow and edge. Lower Hutt.", source: 'Referral', status: 'contacted', notes: 'Left voicemail 2 days after enquiry, waiting on callback.', daysAgo: 18 },
  { name: "Fa'amoana Tuilagi", email: 'faamoana.tuilagi@gmail.com', phone: '021 556 7789', message: 'Keen to get a regular garden maintenance visit set up — monthly is probably enough. Property in Johnsonville.', source: 'Social Media', status: 'contacted', notes: 'Spoke Tuesday, sending quote this week.', daysAgo: 24 },
  { name: "Brendan O'Leary", email: 'brendan.oleary@outlook.com', phone: '027 112 6690', message: 'Need a section clearance done — overgrown back section, blackberry and gorse. Melling, Lower Hutt. Can you come take a look?', source: 'Website', status: 'contacted', notes: 'Site visit done — scoped as a 2-day job, quote sent. Awaiting response.', daysAgo: 33 },
  { name: 'Ngaire Stevens', email: 'ngaire.stevens@xtra.co.nz', phone: '022 340 5512', message: 'Looking at doing some native planting along our back fence line — want it low maintenance. Karori.', source: 'Referral', status: 'contacted', notes: 'Measured up, plant list drafted, quote to follow.', daysAgo: 41 },
  { name: 'Marcus Reid', email: 'marcus.reid@gmail.com', phone: '021 774 2298', message: 'Our lawn is in rough shape after winter — patchy and full of moss. Wanting a full renovation. Miramar.', source: 'Google', status: 'converted', notes: 'Converted to client — first job booked in.', daysAgo: 52 },
  { name: 'Aisha Khan', email: 'aisha.khan@hotmail.com', phone: '027 903 1187', message: 'Weekly lawns for a small block of townhouses we manage. 6 units, shared driveway garden strip. Newtown.', source: 'Website', status: 'converted', notes: 'Signed up for weekly contract.', daysAgo: 61 },
  { name: "Kevin O'Brien", email: 'kevin.obrien@xtra.co.nz', phone: '022 556 9034', message: 'Hedge trim front and back, plus a general tidy up before we put the house on the market. Khandallah.', source: 'Social Media', status: 'lost', notes: 'Went with another contractor who could start sooner.', daysAgo: 70 },
  { name: 'Holly Everton', email: 'holly.everton@gmail.com', phone: '021 448 6612', message: 'Interested in a garden makeover — raised beds, some new planting, and better edging around the lawn. Whitby.', source: 'Referral', status: 'new', notes: null, daysAgo: 2 },
]

// ─────────────────────────────────────────────────────────────────────────────
// 4. JOBS — 25 jobs across all statuses, spread over the last 3 months and
//    the next 2 weeks. clientIdx indexes into CLIENTS; staffIdx indexes into
//    the 6 field staff only (STAFF[2..7], i.e. the two admins excluded) —
//    resolved below via `fieldStaff[job.staffIdx % fieldStaff.length]`.
// ─────────────────────────────────────────────────────────────────────────────

const JOBS = [
  // ── Pending (5) — awaiting scheduling, near-term placeholder dates
  { title: 'Weekly Lawn Mow', job_type: 'Lawn Mowing', status: 'pending', clientIdx: 0, staffIdx: 0, daysOffset: 3 },
  { title: 'Garden Tidy & Weed', job_type: 'Garden Maintenance', status: 'pending', clientIdx: 5, staffIdx: 2, daysOffset: 5 },
  { title: 'Hedge Trim Front & Back', job_type: 'Hedging', status: 'pending', clientIdx: 8, staffIdx: 4, daysOffset: 6 },
  { title: 'Section Clearance', job_type: 'Other', status: 'pending', clientIdx: 4, staffIdx: 5, daysOffset: 8 },
  { title: 'Native Planting Install', job_type: 'Planting', status: 'pending', clientIdx: 2, staffIdx: 1, daysOffset: 10 },

  // ── Scheduled (5) — booked in over the next 2 weeks
  { title: 'Weekly Lawn Mow', job_type: 'Lawn Mowing', status: 'scheduled', clientIdx: 0, staffIdx: 0, daysOffset: 1 },
  { title: 'Fortnightly Garden Maintenance', job_type: 'Garden Maintenance', status: 'scheduled', clientIdx: 3, staffIdx: 3, daysOffset: 2 },
  { title: 'Lawn Renovation', job_type: 'Lawn Mowing', status: 'scheduled', clientIdx: 6, staffIdx: 4, daysOffset: 7 },
  { title: 'Hedge Trim Front & Back', job_type: 'Hedging', status: 'scheduled', clientIdx: 9, staffIdx: 2, daysOffset: 9 },
  { title: 'Weekly Lawn Mow', job_type: 'Lawn Mowing', status: 'scheduled', clientIdx: 7, staffIdx: 0, daysOffset: 13 },

  // ── In Progress (3) — today / yesterday
  { title: 'Section Clearance', job_type: 'Other', status: 'in_progress', clientIdx: 4, staffIdx: 5, daysOffset: 0 },
  { title: 'Garden Tidy & Weed', job_type: 'Garden Maintenance', status: 'in_progress', clientIdx: 9, staffIdx: 3, daysOffset: 0 },
  { title: 'Native Planting Install', job_type: 'Planting', status: 'in_progress', clientIdx: 5, staffIdx: 1, daysOffset: -1 },

  // ── Complete (7) — past, not yet invoiced
  { title: 'Weekly Lawn Mow', job_type: 'Lawn Mowing', status: 'complete', clientIdx: 0, staffIdx: 0, daysOffset: -6 },
  { title: 'Hedge Trim Front & Back', job_type: 'Hedging', status: 'complete', clientIdx: 8, staffIdx: 4, daysOffset: -11 },
  { title: 'Garden Tidy & Weed', job_type: 'Garden Maintenance', status: 'complete', clientIdx: 1, staffIdx: 2, daysOffset: -15 },
  { title: 'Weekly Lawn Mow', job_type: 'Lawn Mowing', status: 'complete', clientIdx: 7, staffIdx: 0, daysOffset: -19 },
  { title: 'Fortnightly Garden Maintenance', job_type: 'Garden Maintenance', status: 'complete', clientIdx: 3, staffIdx: 3, daysOffset: -22 },
  { title: 'Lawn Renovation', job_type: 'Lawn Mowing', status: 'complete', clientIdx: 6, staffIdx: 4, daysOffset: -28 },
  { title: 'Weekly Lawn Mow', job_type: 'Lawn Mowing', status: 'complete', clientIdx: 0, staffIdx: 0, daysOffset: -33 },

  // ── Invoiced (3) — past, complete and already billed
  { title: 'Native Planting Install', job_type: 'Planting', status: 'invoiced', clientIdx: 2, staffIdx: 1, daysOffset: -38 },
  { title: 'Section Clearance', job_type: 'Other', status: 'invoiced', clientIdx: 4, staffIdx: 5, daysOffset: -45 },
  { title: 'Full Property Tidy', job_type: 'Garden Maintenance', status: 'invoiced', clientIdx: 9, staffIdx: 3, daysOffset: -52 },

  // ── Cancelled (2)
  { title: 'Hedge Trim Front & Back', job_type: 'Hedging', status: 'cancelled', clientIdx: 1, staffIdx: 2, daysOffset: -14 },
  { title: 'Garden Tidy & Weed', job_type: 'Garden Maintenance', status: 'cancelled', clientIdx: 8, staffIdx: 5, daysOffset: 4 },
]

// Finds the index (into JOBS) of a job for a given client in one of the given
// statuses — used below so quotes/invoices/purchase orders that reference "a
// job for this client" stay consistent with JOBS instead of hand-counted
// indices (which is exactly the kind of thing that's easy to get wrong and
// silently link a quote/invoice to the wrong client's job).
function findJobIndex(clientIdx, statuses) {
  const idx = JOBS.findIndex(j => j.clientIdx === clientIdx && statuses.includes(j.status))
  return idx === -1 ? null : idx
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. QUOTES — 12 quotes with line items, spread across the last 3 months.
//    jobIdx (optional) links a quote to one of the JOBS above by index.
// ─────────────────────────────────────────────────────────────────────────────

const QUOTES = [
  {
    status: 'accepted', clientIdx: 2, jobIdx: findJobIndex(2, ['invoiced']), daysAgo: 40,
    items: [
      { description: 'Native plants — supply (mixed flax, cabbage tree, hebe)', quantity: 24, unit_price: 14.5 },
      { description: 'Planting labour', quantity: 8, unit_price: 45 },
      { description: 'Mulch supply and lay', quantity: 6, unit_price: 28 },
    ],
  },
  {
    status: 'accepted', clientIdx: 4, jobIdx: findJobIndex(4, ['invoiced']), daysAgo: 47,
    items: [
      { description: 'Section clearance — brush cutting and blackberry removal', quantity: 16, unit_price: 42 },
      { description: 'Green waste removal — trailer loads', quantity: 4, unit_price: 85 },
    ],
  },
  {
    status: 'accepted', clientIdx: 6, jobIdx: findJobIndex(6, ['complete']), daysAgo: 30,
    items: [
      { description: 'Lawn scarify and dethatch', quantity: 1, unit_price: 220 },
      { description: 'Lawn seed — ryegrass blend', quantity: 5, unit_price: 32 },
      { description: 'Topsoil top-dress', quantity: 8, unit_price: 45 },
      { description: 'Labour — renovation day', quantity: 1, unit_price: 380 },
    ],
  },
  {
    status: 'accepted', clientIdx: 9, jobIdx: findJobIndex(9, ['invoiced']), daysAgo: 54,
    items: [
      { description: 'Full property tidy — mowing, edging, hedge trim', quantity: 1, unit_price: 620 },
      { description: 'Garden waste disposal', quantity: 3, unit_price: 85 },
    ],
  },
  { status: 'sent', clientIdx: 5, jobIdx: null, daysAgo: 8, items: [
      { description: 'Fortnightly garden maintenance — setup visit', quantity: 1, unit_price: 180 },
      { description: 'Garden bed weeding and mulch top-up', quantity: 5, unit_price: 32 },
    ] },
  { status: 'sent', clientIdx: 1, jobIdx: null, daysAgo: 12, items: [
      { description: 'Hedge trim — front and rear boundary', quantity: 1, unit_price: 340 },
      { description: 'Clippings removal', quantity: 2, unit_price: 65 },
    ] },
  { status: 'sent', clientIdx: 8, jobIdx: null, daysAgo: 20, items: [
      { description: 'Garden makeover — raised bed install', quantity: 3, unit_price: 320 },
      { description: 'New planting — mixed perennials', quantity: 18, unit_price: 11 },
      { description: 'Edging supply and install', quantity: 12, unit_price: 22 },
    ] },
  { status: 'draft', clientIdx: 3, jobIdx: null, daysAgo: 3, items: [
      { description: 'Monthly courtyard planter maintenance', quantity: 1, unit_price: 260 },
      { description: 'Seasonal colour planting — annuals', quantity: 20, unit_price: 6.5 },
    ] },
  { status: 'draft', clientIdx: 7, jobIdx: null, daysAgo: 6, items: [
      { description: 'Weekly lawn mow — 6 unit block', quantity: 1, unit_price: 145 },
      { description: 'Shared driveway garden strip tidy', quantity: 1, unit_price: 95 },
    ] },
  { status: 'draft', clientIdx: 0, jobIdx: null, daysAgo: 1, items: [
      { description: 'Spring garden clean-up', quantity: 1, unit_price: 480 },
      { description: 'Pruning — roses and shrubs', quantity: 4, unit_price: 55 },
    ] },
  { status: 'declined', clientIdx: 9, jobIdx: null, daysAgo: 65, items: [
      { description: 'Full irrigation system install', quantity: 1, unit_price: 2400 },
      { description: 'Trenching and dripline supply', quantity: 1, unit_price: 950 },
    ] },
  { status: 'declined', clientIdx: 6, jobIdx: null, daysAgo: 72, items: [
      { description: 'Retaining wall garden bed rebuild', quantity: 1, unit_price: 1850 },
      { description: 'Landscaping timber supply', quantity: 1, unit_price: 620 },
    ] },
]

// ─────────────────────────────────────────────────────────────────────────────
// 6. INVOICES — 15 invoices: 10 paid (spread over the last 6 months, summing
//    to ~$18k of paid revenue), 3 outstanding (sent, not yet due), 2 overdue.
// ─────────────────────────────────────────────────────────────────────────────

// Each `total` here is GST-inclusive; amount (ex-GST) and tax are derived.
const PAID_INVOICES = [
  { clientIdx: 0, jobIdx: findJobIndex(0, ['complete']), total: 650, paidDaysAgo: 175, notes: 'Weekly lawn mow x4 visits.' },
  { clientIdx: 8, jobIdx: null, total: 920, paidDaysAgo: 155, notes: 'Garden tidy and hedge trim combined visit.' },
  { clientIdx: 1, jobIdx: findJobIndex(1, ['complete']), total: 1450, paidDaysAgo: 130, notes: 'Garden tidy and hedge trim — combined visit, plus green waste removal.' },
  { clientIdx: 6, jobIdx: findJobIndex(6, ['complete']), total: 2200, paidDaysAgo: 105, notes: 'Lawn renovation — scarify, overseed, top-dress.' },
  { clientIdx: 2, jobIdx: findJobIndex(2, ['invoiced']), total: 780, paidDaysAgo: 88, notes: 'Native planting — back fence line.' },
  { clientIdx: 3, jobIdx: findJobIndex(3, ['complete']), total: 1900, paidDaysAgo: 70, notes: 'Monthly courtyard and planter maintenance — 3 visits.' },
  { clientIdx: 4, jobIdx: findJobIndex(4, ['invoiced']), total: 3100, paidDaysAgo: 52, notes: 'Section clearance — 2-day job, green waste disposal.' },
  { clientIdx: 9, jobIdx: findJobIndex(9, ['invoiced']), total: 1150, paidDaysAgo: 35, notes: 'Full property tidy — mowing, edging, hedging.' },
  { clientIdx: 7, jobIdx: findJobIndex(7, ['complete']), total: 2650, paidDaysAgo: 18, notes: 'Weekly lawn mow — quarterly billing, 6 visits.' },
  { clientIdx: 5, jobIdx: findJobIndex(5, ['in_progress']), total: 3200, paidDaysAgo: 6, notes: 'Native planting install — first-half payment, job in progress.' },
]

const OUTSTANDING_INVOICES = [
  { clientIdx: 0, jobIdx: null, total: 850, createdDaysAgo: 4, dueInDays: 10, notes: 'Weekly lawn mow — latest billing cycle.' },
  { clientIdx: 3, jobIdx: null, total: 1200, createdDaysAgo: 6, dueInDays: 14, notes: 'Courtyard planter monthly service.' },
  { clientIdx: 9, jobIdx: null, total: 1650, createdDaysAgo: 8, dueInDays: 7, notes: 'Weekly grounds maintenance — current cycle.' },
]

const OVERDUE_INVOICES = [
  { clientIdx: 1, jobIdx: null, total: 950, createdDaysAgo: 35, dueDaysAgo: 8, notes: 'Hedge trim — follow-up visit.' },
  { clientIdx: 6, jobIdx: null, total: 1800, createdDaysAgo: 45, dueDaysAgo: 15, notes: 'Lawn maintenance — overdue reminder sent.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// 7. PURCHASE ORDERS — 8, linked to jobs, mixed suppliers/statuses.
// ─────────────────────────────────────────────────────────────────────────────

const PURCHASE_ORDERS = [
  { supplier: 'Oderings Garden Centre', description: 'Native plants — assorted 40L bags (flax, cabbage tree, hebe)', amount: 348, status: 'received', jobIdx: 20, daysAgo: 42 },
  { supplier: 'Bunnings', description: 'Mulch — 20 bags bark chip', amount: 210, status: 'received', jobIdx: 12, daysAgo: 8 },
  { supplier: 'Mitre 10', description: 'Aluminium edging — 6m lengths x 4, pegs and connectors', amount: 186, status: 'approved', jobIdx: 15, daysAgo: 5 },
  { supplier: 'Landscape Supplies NZ', description: 'Topsoil — 1m3 bulk bag, premium blend', amount: 245, status: 'received', jobIdx: findJobIndex(6, ['complete']), daysAgo: 33 },
  { supplier: 'Palmers Garden Centre', description: 'Slow-release fertiliser — 10kg, plus lawn seed 5kg', amount: 132, status: 'pending', jobIdx: 6, daysAgo: 1 },
  { supplier: 'Bunnings', description: 'Weed mat — 2m x 50m roll, staples', amount: 98, status: 'received', jobIdx: 21, daysAgo: 50 },
  { supplier: 'Oderings Garden Centre', description: 'Seasonal colour planting — annuals x 20', amount: 145, status: 'pending', jobIdx: 4, daysAgo: 2 },
  { supplier: 'Landscape Supplies NZ', description: 'Irrigation fittings and dripline — 30m', amount: 780, status: 'cancelled', jobIdx: null, daysAgo: 60 },
]

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding demo data for Green & Co Landscaping (Wellington, NZ)...\n')

  // 1. Clients
  const insertedClients = await insertBatch('clients', CLIENTS, 'clients')
  console.log(`✓ Clients inserted: ${insertedClients.length}`)

  // 1b. Sites (one per client, same order as CLIENTS/insertedClients)
  const siteRows = SITES.map((site, i) => ({ ...site, client_id: insertedClients[i].id }))
  const insertedSites = await insertBatch('sites', siteRows, 'sites')
  console.log(`✓ Sites inserted: ${insertedSites.length}`)

  // 2. Staff
  const insertedStaff = await insertBatch('staff', STAFF, 'staff')
  console.log(`✓ Staff inserted: ${insertedStaff.length}`)
  const fieldStaff = insertedStaff.filter(s => s.role === 'field')

  // 3. Leads
  const leadRows = LEADS.map(({ daysAgo, ...lead }) => ({
    ...lead,
    created_at: timestamp(-daysAgo),
  }))
  const insertedLeads = await insertBatch('leads', leadRows, 'leads')
  console.log(`✓ Leads inserted: ${insertedLeads.length}`)

  // 4. Jobs
  const jobRows = JOBS.map((job, i) => {
    const client = insertedClients[job.clientIdx]
    const staffMember = fieldStaff[job.staffIdx % fieldStaff.length]
    const isPast = ['complete', 'invoiced'].includes(job.status)
    return {
      title: job.title,
      job_type: job.job_type,
      status: job.status,
      client_id: client.id,
      staff_id: staffMember.id,
      // Real address lives on the client's site — see the SITES comment above.
      site_id: insertedSites[job.clientIdx].id,
      location: null,
      scheduled_date: dateOnly(job.daysOffset),
      start_time: '08:00',
      end_time: '10:30',
      completed_date: isPast ? dateOnly(job.daysOffset) : null,
      is_recurring: false,
      recurrence_pattern: null,
      recurring_series_id: null,
      notes: null,
      created_at: timestamp(Math.min(job.daysOffset - 1, -1)),
    }
  })
  const insertedJobs = await insertBatch('jobs', jobRows, 'jobs')
  console.log(`✓ Jobs inserted: ${insertedJobs.length}`)

  // 5. Quotes + line items
  let quoteCount = 0
  let lineItemCount = 0
  for (const quote of QUOTES) {
    const client = insertedClients[quote.clientIdx]
    const job = quote.jobIdx != null ? insertedJobs[quote.jobIdx] : null
    const subtotal = quote.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const gst = Math.round(subtotal * 0.15 * 100) / 100
    const total = Math.round((subtotal + gst) * 100) / 100
    const createdAt = timestamp(-quote.daysAgo)
    const sentAt = quote.status === 'draft' ? null : timestamp(-quote.daysAgo + 1)

    const [insertedQuote] = await insertBatch('quotes', [{
      client_id: client.id,
      job_id: job ? job.id : null,
      status: quote.status,
      valid_until: dateOnly(-quote.daysAgo + 30),
      notes: null,
      subtotal: Math.round(subtotal * 100) / 100,
      gst,
      total,
      created_at: createdAt,
      sent_at: sentAt,
      last_followed_up_at: null,
    }], 'quotes')
    quoteCount++

    const lineItemRows = quote.items.map((item, i) => ({
      quote_id: insertedQuote.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: Math.round(item.quantity * item.unit_price * 100) / 100,
      sort_order: i,
    }))
    const insertedLineItems = await insertBatch('quote_line_items', lineItemRows, 'quote_line_items')
    lineItemCount += insertedLineItems.length
  }
  console.log(`✓ Quotes inserted: ${quoteCount}`)
  console.log(`✓ Quote line items inserted: ${lineItemCount}`)

  // 6. Invoices
  function toInvoiceRow({ clientIdx, jobIdx, total }, extra) {
    const amount = Math.round((total / 1.15) * 100) / 100
    const tax = Math.round((total - amount) * 100) / 100
    const client = insertedClients[clientIdx]
    const job = jobIdx != null ? insertedJobs[jobIdx] : null
    return {
      client_id: client.id,
      job_id: job ? job.id : null,
      quote_id: null,
      amount,
      tax,
      total,
      ...extra,
    }
  }

  const paidRows = PAID_INVOICES.map(inv => toInvoiceRow(inv, {
    status: 'paid',
    // Issued 2 weeks before payment, due a few days before actual payment —
    // keeps created_at < due_date < paid_date in a realistic order.
    due_date: dateOnly(-inv.paidDaysAgo - 4),
    paid_date: dateOnly(-inv.paidDaysAgo),
    notes: inv.notes,
    created_at: timestamp(-inv.paidDaysAgo - 14),
  }))
  const outstandingRows = OUTSTANDING_INVOICES.map(inv => toInvoiceRow(inv, {
    status: 'sent',
    due_date: dateOnly(inv.dueInDays),
    paid_date: null,
    notes: inv.notes,
    created_at: timestamp(-inv.createdDaysAgo),
  }))
  const overdueRows = OVERDUE_INVOICES.map(inv => toInvoiceRow(inv, {
    status: 'overdue',
    due_date: dateOnly(-inv.dueDaysAgo),
    paid_date: null,
    notes: inv.notes,
    created_at: timestamp(-inv.createdDaysAgo),
  }))

  const insertedPaid = await insertBatch('invoices', paidRows, 'paid invoices')
  const insertedOutstanding = await insertBatch('invoices', outstandingRows, 'outstanding invoices')
  const insertedOverdue = await insertBatch('invoices', overdueRows, 'overdue invoices')
  const totalInvoices = insertedPaid.length + insertedOutstanding.length + insertedOverdue.length
  const totalPaidRevenue = insertedPaid.reduce((sum, inv) => sum + Number(inv.total), 0)
  console.log(`✓ Invoices inserted: ${totalInvoices} (${insertedPaid.length} paid, ${insertedOutstanding.length} outstanding, ${insertedOverdue.length} overdue)`)
  console.log(`  Paid revenue total: $${totalPaidRevenue.toFixed(2)} across the last 6 months`)

  // 7. Purchase orders
  const poRows = PURCHASE_ORDERS.map(po => ({
    job_id: po.jobIdx != null ? insertedJobs[po.jobIdx].id : null,
    supplier: po.supplier,
    description: po.description,
    amount: po.amount,
    status: po.status,
    receipt_url: null,
    created_at: timestamp(-po.daysAgo),
  }))
  const insertedPOs = await insertBatch('purchase_orders', poRows, 'purchase orders')
  console.log(`✓ Purchase orders inserted: ${insertedPOs.length}`)

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────')
  console.log('Seed complete — Green & Co Landscaping demo data')
  console.log('──────────────────────────────────────────')
  console.log(`Clients:            ${insertedClients.length}`)
  console.log(`Sites:              ${insertedSites.length}`)
  console.log(`Staff:              ${insertedStaff.length}`)
  console.log(`Leads:              ${insertedLeads.length}`)
  console.log(`Jobs:               ${insertedJobs.length}`)
  console.log(`Quotes:             ${quoteCount}`)
  console.log(`Quote line items:   ${lineItemCount}`)
  console.log(`Invoices:           ${totalInvoices}`)
  console.log(`Purchase orders:    ${insertedPOs.length}`)
  console.log('──────────────────────────────────────────\n')
}

main().catch(err => {
  console.error('\n✗ Seed script failed:', err)
  process.exit(1)
})
