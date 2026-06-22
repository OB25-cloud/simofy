// Full demo data rebuild for Wakatipu Landscaping — DESTRUCTIVE.
// Anchored on Tuesday 23 June 2026 as "today" (hardcoded, not derived from
// the system clock, so re-running this script later doesn't shift the
// dataset). Deletes all rows from the operational tables listed below
// (checklist_templates / checklist_template_items and the materials
// catalogue are left untouched) and inserts a clean, realistic dataset
// using the Supabase SERVICE ROLE client (bypasses RLS).
//
// Run: node seed-rebuild-demo.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── env ──────────────────────────────────────────────────────────────────────

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('✗ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local — required to bypass RLS for this rebuild.')
  process.exit(1)
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── helpers ──────────────────────────────────────────────────────────────────

function rand(min, max) { return Math.random() * (max - min) + min }
function randInt(min, max) { return Math.floor(rand(min, max + 1)) }
function pick(arr) { return arr[randInt(0, arr.length - 1)] }
function pickWeighted(weighted) {
  const total = weighted.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [value, w] of weighted) {
    if (r < w) return value
    r -= w
  }
  return weighted[weighted.length - 1][0]
}
function sampleDistinct(arr, n) {
  const pool = [...arr]
  const out = []
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = randInt(0, pool.length - 1)
    out.push(pool[idx])
    pool.splice(idx, 1)
  }
  return out
}
function round2(n) { return Math.round(n * 100) / 100 }
function dateStr(d) { return d.toISOString().split('T')[0] }
// All dates below are UTC-midnight instants (see TODAY). Adding exact 24h
// multiples and comparing with </> works safely and avoids local-timezone
// day-boundary bugs that setDate()/getDay() would otherwise introduce.
function addDays(d, n) { return new Date(d.getTime() + n * 86400000) }

async function insertBatched(table, rows, returning = true, batchSize = 200) {
  const out = []
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const q = sb.from(table).insert(chunk)
    const { data, error } = returning ? await q.select() : await q
    if (error) throw new Error(`${table} insert (rows ${i}-${i + chunk.length}): ${error.message}`)
    if (returning && data) out.push(...data)
  }
  console.log(`  inserted ${rows.length} into ${table}`)
  return out
}

// ── reference data ────────────────────────────────────────────────────────────

// Anchor date, explicitly fixed per request (Tuesday 23 June 2026 — yes, a
// Tuesday, not a Monday; treated as "today" regardless).
const TODAY = new Date(Date.UTC(2026, 5, 23))
const THIS_WEEK_START = TODAY
const THIS_WEEK_END = addDays(TODAY, 5)          // 6-day window: 23–28 June
const PAST_START = addDays(TODAY, -42)           // 6 weeks before today: 12 May
const FUTURE_START = addDays(TODAY, 6)           // 29 June
const FUTURE_END = addDays(TODAY, 19)             // 12 July (2 weeks)

const JOB_TYPES_WEIGHTED = [
  ['Lawn Mowing', 35],
  ['Garden Maintenance', 20],
  ['Hedge Trimming', 15],
  ['Section Clearance', 10],
  ['Tree Pruning', 10],
  ['Irrigation', 5],
  ['Landscaping Install', 5],
]
const TITLE_TEMPLATES = {
  'Lawn Mowing':         ['Weekly Lawn Mow', 'Lawn Mow & Edge', 'Mow & Trim'],
  'Garden Maintenance':  ['Garden Tidy & Weed', 'Garden Maintenance Visit', 'Bed Maintenance'],
  'Hedge Trimming':      ['Hedge Trim', 'Boundary Hedge Trim', 'Box Hedge Tidy'],
  'Section Clearance':   ['Section Clearance', 'Overgrowth Clearance', 'Blackberry & Gorse Clearance'],
  'Tree Pruning':        ['Tree Pruning', 'Fruit Tree Prune', 'Deciduous Tree Prune'],
  'Irrigation':          ['Irrigation System Install', 'Irrigation Repair & Service', 'Drip Line Install'],
  'Landscaping Install': ['Garden Redesign Install', 'Native Planting Install', 'Retaining Wall & Planting'],
}

async function run() {
  console.log('=== Wakatipu Landscaping — full demo rebuild ===\n')
  console.log(`Anchor "today": ${dateStr(TODAY)} (Tuesday, per request)`)
  console.log(`This week:   ${dateStr(THIS_WEEK_START)} -> ${dateStr(THIS_WEEK_END)}`)
  console.log(`Past 6wk:    ${dateStr(PAST_START)} -> ${dateStr(addDays(TODAY, -1))}`)
  console.log(`Next 2wk:    ${dateStr(FUTURE_START)} -> ${dateStr(FUTURE_END)}\n`)

  // ── 1. Delete existing data (FK-safe order, as specified) ──────────────────
  console.log('Clearing existing data...')
  const deleteTables = [
    'notifications', 'job_checklist_items', 'job_materials', 'purchase_orders',
    'job_photos', 'job_notes', 'quote_line_items', 'quotes', 'invoices',
    'leads', 'job_staff', 'jobs', 'sites', 'clients', 'staff',
  ]
  for (const table of deleteTables) {
    const { error } = await sb.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) console.warn(`  [warn] delete ${table}: ${error.message}`)
    else console.log(`  cleared: ${table}`)
  }
  console.log()

  // ── 2. Staff (8) — 2 admin, 6 field ─────────────────────────────────────────
  const staff = await insertBatched('staff', [
    { name: 'Simon Paterson',    email: 'simon@wakatipulandscaping.co.nz',    phone: '021 234 5678', role: 'admin', pay_rate: 98, is_active: true },
    { name: 'Charmila Paterson', email: 'charmila@wakatipulandscaping.co.nz', phone: '021 345 6789', role: 'admin', pay_rate: 95, is_active: true },
    { name: 'Jake Tindall',      email: 'jake@wakatipulandscaping.co.nz',     phone: '021 456 7890', role: 'field', pay_rate: 38, is_active: true },
    { name: 'Liam Foster',       email: 'liam@wakatipulandscaping.co.nz',     phone: '027 567 8901', role: 'field', pay_rate: 29, is_active: true },
    { name: 'Cody Marsh',        email: 'cody@wakatipulandscaping.co.nz',     phone: '021 222 3333', role: 'field', pay_rate: 39, is_active: true },
    { name: 'Emma Bright',       email: 'emma@wakatipulandscaping.co.nz',     phone: '021 333 4444', role: 'field', pay_rate: 31, is_active: true },
    { name: 'Ben Hawke',         email: 'ben@wakatipulandscaping.co.nz',      phone: '021 444 5555', role: 'field', pay_rate: 30, is_active: true },
    { name: 'Mia Chen',          email: 'mia@wakatipulandscaping.co.nz',      phone: '021 555 6666', role: 'field', pay_rate: 32, is_active: true },
  ])
  const fieldStaff = staff.filter(s => s.role === 'field')

  // ── 3. Clients (12) ──────────────────────────────────────────────────────────
  const clients = await insertBatched('clients', [
    { name: 'Margaret Thompson', business_name: null, phone: '03 442 1234',  email: 'mthompson@gmail.com',         address: '14 Panorama Terrace, Queenstown 9300',   notes: 'Prefers morning appointments. Has a golden retriever.',                is_active: true },
    { name: 'Rachel Sorenson',   business_name: null, phone: '021 890 1234', email: 'rachel.sorenson@outlook.com', address: '28 Hallenstein Street, Queenstown 9300', notes: 'Keen on a full garden redesign next spring.',                          is_active: true },
    { name: 'Tom Hargreaves',    business_name: null, phone: '03 443 0987',  email: 'tom.h@hotmail.com',           address: '12 Suburb Street, Queenstown 9300',      notes: 'Weekly mowing contract, two properties.',                              is_active: true },
    { name: 'Ben Whitfield',     business_name: null, phone: '021 678 9012', email: 'bwhitfield@gmail.com',        address: '22 Gorge Road, Queenstown 9300',         notes: 'Recently moved in, section needed full clearance.',                    is_active: true },
    { name: 'Te Rangi Parata',   business_name: 'Frankton Park School', phone: '03 442 8800', email: 'admin@franktonparkschool.school.nz', address: '6 School Road, Frankton, Queenstown 9300', notes: 'School grounds. No work during school hours (8:30am–3pm term time).', is_active: true },
    { name: 'Sarah Kelloway',    business_name: null, phone: '027 678 1234', email: 'sarah.kelloway@gmail.com',    address: '5 Merioneth Street, Arrowtown 9302',     notes: 'Heritage cottage garden — careful with the original stone edging.',    is_active: true },
    { name: 'David Ng',          business_name: null, phone: '027 234 5678', email: 'davidng@xtra.co.nz',          address: '3 Aubrey Road, Wanaka 9305',             notes: 'Remote property — confirm access gate code before each visit.',       is_active: true },
    { name: 'Steph Mannering',   business_name: null, phone: '027 345 6789', email: 'steph.mannering@xtra.co.nz',  address: '45 Brownston Street, Wanaka 9305',       notes: 'Large gardens, interested in spring planting project.',                is_active: true },
    { name: 'Claire Hurst',      business_name: 'Cardrona Alpine Resort', phone: '03 443 7341', email: 'operations@cardrona.com', address: '2 Mount Cardrona Station Road, Wanaka 9305', notes: 'Commercial contract — quarterly garden maintenance. Invoice to accounts payable.', is_active: true },
    { name: 'Susan Reid',        business_name: 'Wanaka Medical Centre', phone: '03 443 0500', email: 'reception@wanakamedical.co.nz', address: '23 Dunmore Street, Wanaka 9305', notes: 'Monthly grounds tidy, invoice to practice manager.', is_active: true },
    { name: 'Mark Robertson',    business_name: null, phone: '027 456 7890', email: 'mark.robertson@gmail.com',    address: '8 Alpha Street, Cromwell 9310',          notes: null,                                                                   is_active: true },
    { name: 'Anna Fraser',       business_name: null, phone: '021 567 8901', email: 'anna.fraser@xtra.co.nz',      address: '15 Barry Avenue, Cromwell 9310',         notes: 'Dog on property — friendly, but keep gate latched.',                  is_active: true },
  ])
  const [margaret, rachel, tom, ben, frankton, sarah, david, steph, cardrona, wanakaMedical, mark, anna] = clients

  // ── 4. Sites (15) ────────────────────────────────────────────────────────────
  const sites = await insertBatched('sites', [
    { client_id: margaret.id,      address: '14 Panorama Terrace, Queenstown 9300',       location: null, access_notes: 'Side gate on left, always unlocked.',                hazard_notes: null },
    { client_id: rachel.id,        address: '28 Hallenstein Street, Queenstown 9300',     location: null, access_notes: 'Ring doorbell, Rachel usually home.',                hazard_notes: null },
    { client_id: tom.id,           address: '12 Suburb Street, Queenstown 9300',          location: null, access_notes: 'Gate code 2468.',                                    hazard_notes: null },
    { client_id: tom.id,           address: '101 Frankton Road, Queenstown 9300',         location: null, access_notes: 'Second property — key in lockbox, code 7711.',       hazard_notes: null },
    { client_id: ben.id,           address: '22 Gorge Road, Queenstown 9300',             location: null, access_notes: 'Access via rear lane.',                             hazard_notes: 'Overgrown blackberry near fence line.' },
    { client_id: frankton.id,      address: '6 School Road, Frankton, Queenstown 9300',    location: null, access_notes: 'Report to office on arrival. Work outside school hours only.', hazard_notes: 'Children present during term — no ride-on mowers near classrooms.' },
    { client_id: sarah.id,         address: '5 Merioneth Street, Arrowtown 9302',         location: null, access_notes: 'Park on street, narrow driveway.',                  hazard_notes: 'Original stone edging — no machinery within 30cm.' },
    { client_id: david.id,         address: '3 Aubrey Road, Wanaka 9305',                  location: null, access_notes: 'Gate code: 4821.',                                   hazard_notes: 'Irrigation lines run under lawn — shallow in north corner.' },
    { client_id: david.id,         address: '91 Plantation Road, Wanaka 9305',             location: null, access_notes: 'Contact David 30 mins before arrival.',              hazard_notes: null },
    { client_id: steph.id,         address: '45 Brownston Street, Wanaka 9305',            location: null, access_notes: 'Ring ahead — large dog in yard.',                   hazard_notes: null },
    { client_id: cardrona.id,      address: '2 Mount Cardrona Station Road, Wanaka 9305', location: null, access_notes: 'Check in at resort reception. Hi-vis required.',   hazard_notes: 'Heavy vehicle traffic on main access road.' },
    { client_id: cardrona.id,      address: '2312 Cardrona Valley Road, Wanaka 9305',      location: null, access_notes: 'Speak to hotel manager (Josh) on arrival.',         hazard_notes: 'Historic trees — do not prune without prior approval.' },
    { client_id: wanakaMedical.id, address: '23 Dunmore Street, Wanaka 9305',              location: null, access_notes: 'Park in rear staff carpark.',                       hazard_notes: null },
    { client_id: mark.id,          address: '8 Alpha Street, Cromwell 9310',               location: null, access_notes: null,                                                 hazard_notes: null },
    { client_id: anna.id,          address: '15 Barry Avenue, Cromwell 9310',              location: null, access_notes: 'Latch gate behind you — dog on property.',          hazard_notes: null },
  ])
  const sitesByClient = new Map()
  for (const s of sites) {
    if (!sitesByClient.has(s.client_id)) sitesByClient.set(s.client_id, [])
    sitesByClient.get(s.client_id).push(s)
  }

  // ── 5. Jobs ──────────────────────────────────────────────────────────────────
  const jobRows = []

  function buildJob({ date, status, staffMember, client }) {
    const c = client ?? pick(clients)
    const clientSites = sitesByClient.get(c.id) ?? []
    const jobType = pickWeighted(JOB_TYPES_WEIGHTED)
    return {
      title: pick(TITLE_TEMPLATES[jobType]),
      client_id: c.id,
      site_id: clientSites.length > 0 ? pick(clientSites).id : null,
      staff_id: (staffMember ?? pick(fieldStaff)).id,
      job_type: jobType,
      status,
      scheduled_date: dateStr(date),
      completed_date: (status === 'complete' || status === 'invoiced') ? dateStr(date) : null,
      notes: null,
    }
  }

  // -- Past 6 weeks (42 days): ~60 completed jobs, weighted complete/invoiced/cancelled,
  //    spread mostly across weekdays.
  const pastDays = []
  for (let i = 0; i < 42; i++) {
    const d = addDays(PAST_START, i)
    if (d.getUTCDay() === 0) continue // skip Sundays (UTC day-of-week; consistent since all dates are UTC midnight)
    pastDays.push(d)
  }
  const PAST_JOB_COUNT = 60
  for (let i = 0; i < PAST_JOB_COUNT; i++) {
    const date = pick(pastDays)
    const status = pickWeighted([['complete', 70], ['invoiced', 20], ['cancelled', 10]])
    jobRows.push(buildJob({ date, status }))
  }

  // -- Today (23 June): 5 jobs across 5 different staff + 5 different sites,
  //    one already in progress, the rest scheduled later in the day.
  const todayStaff = sampleDistinct(fieldStaff, 5)
  const clientsWithSites = clients.filter(c => (sitesByClient.get(c.id) ?? []).length > 0)
  const todayClients = sampleDistinct(clientsWithSites, 5)
  const todayStatuses = ['in_progress', 'scheduled', 'scheduled', 'scheduled', 'scheduled']
  todayStatuses.forEach((status, i) => {
    jobRows.push(buildJob({ date: TODAY, status, staffMember: todayStaff[i], client: todayClients[i] }))
  })

  // -- Rest of this week (24–28 June): remaining jobs to bring the week's
  //    total to 25–30, mostly scheduled (a few pending), 4–5 per day.
  const restOfWeekDays = []
  for (let i = 1; i <= 5; i++) restOfWeekDays.push(addDays(THIS_WEEK_START, i))
  const thisWeekTarget = randInt(25, 30)
  const remainingThisWeek = thisWeekTarget - todayStatuses.length
  for (let i = 0; i < remainingThisWeek; i++) {
    const date = restOfWeekDays[i % restOfWeekDays.length]
    const status = pickWeighted([['scheduled', 85], ['pending', 15]])
    jobRows.push(buildJob({ date, status }))
  }

  // -- Next 2 weeks (29 June – 12 July): 20 upcoming jobs, mostly scheduled,
  //    spread across weekdays so the 2-week calendar view looks busy.
  const futureDays = []
  for (let i = 0; i < 14; i++) {
    const d = addDays(FUTURE_START, i)
    if (d.getUTCDay() === 0) continue
    futureDays.push(d)
  }
  const FUTURE_JOB_COUNT = 20
  for (let i = 0; i < FUTURE_JOB_COUNT; i++) {
    const date = pick(futureDays)
    const status = pickWeighted([['scheduled', 80], ['pending', 20]])
    jobRows.push(buildJob({ date, status }))
  }

  console.log(`Generated ${jobRows.length} jobs to insert (${PAST_JOB_COUNT} past / ${thisWeekTarget} this week / ${FUTURE_JOB_COUNT} next 2 weeks)`)
  const jobs = await insertBatched('jobs', jobRows)

  const completedJobs = jobs.filter(j => j.status === 'complete' || j.status === 'invoiced')

  // ── 6. Quotes (12) + line items ──────────────────────────────────────────────
  // 4 draft, 5 sent (2 overdue for follow-up >7 days, 3 recent), 3 accepted.
  const quoteJobs = sampleDistinct(jobs, 12)
  const quoteRows = quoteJobs.map((job, i) => {
    let status, sentAt
    if (i < 4) {
      status = 'draft'; sentAt = null
    } else if (i < 9) {
      status = 'sent'
      const overdue = i < 6 // first 2 of the 5 "sent" quotes are overdue
      sentAt = addDays(TODAY, overdue ? -randInt(10, 21) : -randInt(1, 6)).toISOString()
    } else {
      status = 'accepted'
      sentAt = addDays(TODAY, -randInt(10, 25)).toISOString()
    }
    const subtotal = round2(rand(300, 3500))
    const gst = round2(subtotal * 0.15)
    return {
      client_id: job.client_id,
      job_id: job.id,
      status,
      valid_until: dateStr(addDays(TODAY, 30)),
      notes: null,
      subtotal,
      gst,
      total: round2(subtotal + gst),
      sent_at: sentAt,
      last_followed_up_at: null,
    }
  })
  const quotes = await insertBatched('quotes', quoteRows)

  const lineItemRows = []
  for (const quote of quotes) {
    const n = randInt(2, 4)
    const portions = Array.from({ length: n }, () => rand(0.15, 0.4))
    const portionSum = portions.reduce((a, b) => a + b, 0)
    const descriptions = [
      'Labour — site preparation', 'Labour — planting & installation', 'Materials — plants & mulch',
      'Materials — irrigation supplies', 'Travel — return trip', 'Labour — pruning & tidy', 'Disposal / skip bin hire',
    ]
    let allocated = 0
    portions.forEach((p, idx) => {
      const amount = idx === n - 1 ? round2(quote.subtotal - allocated) : round2(quote.subtotal * (p / portionSum))
      allocated += amount
      lineItemRows.push({
        quote_id: quote.id,
        description: descriptions[idx % descriptions.length],
        quantity: 1,
        unit_price: amount,
        amount,
        sort_order: idx + 1,
      })
    })
  }
  await insertBatched('quote_line_items', lineItemRows, false)

  // ── 7. Invoices (20) — linked to completed jobs, $200–$2,500 ─────────────────
  // 12 paid, 5 sent, 3 overdue.
  const invoiceJobs = sampleDistinct(completedJobs, 20)
  const invoiceRows = invoiceJobs.map((job, i) => {
    const amount = round2(rand(175, 2175)) // + 15% GST lands the total within $200–$2,500
    const tax = round2(amount * 0.15)
    const scheduled = new Date(job.scheduled_date)
    const dueDate = addDays(scheduled, 14)
    let status, paidDate
    if (i < 12) {
      status = 'paid'; paidDate = dateStr(addDays(dueDate, -randInt(0, 10)))
    } else if (i < 17) {
      status = 'sent'; paidDate = null
    } else {
      status = 'overdue'; paidDate = null
    }
    return {
      client_id: job.client_id,
      job_id: job.id,
      quote_id: null,
      amount, tax,
      total: round2(amount + tax),
      status,
      due_date: dateStr(dueDate),
      paid_date: paidDate,
      notes: null,
    }
  })
  await insertBatched('invoices', invoiceRows, false)

  // ── 8. Leads (8) — includes one from Wanaka ──────────────────────────────────
  await insertBatched('leads', [
    { name: 'Olivia Bennett',   email: 'olivia.bennett@gmail.com',   phone: '021 789 4561', message: "Hi, I've just bought a property on Lake Esplanade and the garden needs a full tidy-up before summer. Could you send through a quote?", source: 'Website',  status: 'new',       notes: null },
    { name: 'Noah Fitzgerald',  email: 'noah.fitz@outlook.com',      phone: '027 654 3210', message: 'Looking for weekly lawn mowing over summer for a property near Frankton. Roughly 600m2 section.', source: 'Google',   status: 'new',       notes: null },
    { name: 'Grace Sutherland', email: 'grace.suth@xtra.co.nz',      phone: '03 442 9911',  message: 'We have a hedge along the boundary that needs trimming before our daughter’s wedding next month — is that something you can fit in?', source: 'Referral', status: 'contacted', notes: 'Called 2026-06-18, booked a site visit for next week.' },
    { name: 'Henry Caldwell',   email: 'henry.caldwell@gmail.com',   phone: '021 432 8765', message: 'Interested in a quote for a full section clearance — overgrown gorse and blackberry on a Wanaka property.', source: 'Facebook', status: 'contacted', notes: 'Sent quote request form, awaiting site access details.' },
    { name: 'Chloe Whitmore',   email: 'chloe.whitmore@hotmail.com', phone: '027 321 6549', message: 'Can you do an irrigation install for a new garden bed? About 40m2, drip line preferred. We\'re on Mount Iron Road in Wanaka.', source: 'Website', status: 'new', notes: null },
    { name: 'Jack Donovan',     email: 'jack.donovan@gmail.com',     phone: '021 998 7766', message: 'Need someone for regular garden maintenance — monthly visits, medium-sized garden in Cromwell.', source: 'Google', status: 'contacted', notes: 'Spoke on phone 2026-06-16, sending quote this week.' },
    { name: 'Mia Sheppard',     email: 'mia.sheppard@xtra.co.nz',    phone: '03 443 2200',  message: 'Looking to convert my rental property’s lawn to a low-maintenance native garden. Keen for a quote and design ideas.', source: 'Referral', status: 'converted', notes: 'Converted — landscaping install booked for next month.' },
    { name: 'Ethan Caldicott',  email: 'ethan.caldicott@gmail.com',  phone: '021 554 3322', message: 'We run a small lodge near Glenorchy and need ongoing grounds maintenance — happy to discuss a contract.', source: 'Website', status: 'converted', notes: 'Converted — commercial contract signed, quarterly visits.' },
  ], false)

  // ── 9. Materials usage on 15 completed jobs ──────────────────────────────────
  const { data: materials, error: matErr } = await sb.from('materials').select('id, unit, unit_cost')
  if (matErr) throw new Error(`materials select: ${matErr.message}`)
  if (!materials || materials.length === 0) {
    console.warn('  [warn] materials catalogue is empty — skipping job_materials')
  } else {
    const materialJobs = sampleDistinct(completedJobs, 15)
    const jobMaterialRows = []
    for (const job of materialJobs) {
      const lineCount = randInt(1, 3)
      const usedMaterialIds = new Set()
      for (let i = 0; i < lineCount; i++) {
        const material = pick(materials)
        if (usedMaterialIds.has(material.id)) continue
        usedMaterialIds.add(material.id)
        const quantity = material.unit === 'each' ? randInt(2, 10) : round2(rand(1, 6))
        jobMaterialRows.push({
          job_id: job.id,
          material_id: material.id,
          quantity,
          unit_cost: material.unit_cost,
        })
      }
    }
    await insertBatched('job_materials', jobMaterialRows, false)
  }

  // ── 10. Purchase orders on 6 jobs — NZ supplier names ────────────────────────
  const SUPPLIERS = [
    'Mitre 10 Mega Queenstown', 'Bunnings Warehouse Queenstown', 'Wanaka Garden Centre',
    'Queenstown Landscape Supplies', 'Mitre 10 Wanaka', 'Bunnings Warehouse Cromwell',
  ]
  const poJobs = sampleDistinct(jobs, 6)
  const poStatuses = ['received', 'received', 'approved', 'approved', 'pending', 'cancelled']
  const poRows = poJobs.map((job, i) => ({
    job_id: job.id,
    supplier: SUPPLIERS[i % SUPPLIERS.length],
    description: pick([
      'Bark mulch and topsoil for garden beds', 'Replacement irrigation fittings', 'Bagged compost and fertiliser',
      'Native plants for border planting', 'Weed mat and edging', 'Hedge trimmer blade replacement',
    ]),
    amount: round2(rand(80, 900)),
    status: poStatuses[i % poStatuses.length],
    receipt_url: null,
  }))
  await insertBatched('purchase_orders', poRows, false)

  // ── 11. Job notes on 8 jobs ───────────────────────────────────────────────────
  const noteJobs = sampleDistinct(completedJobs, 8)
  const NOTE_TEXTS = [
    'Mowed front and back lawns, edges trimmed. Noticed a small irrigation leak near the deck — flagged for follow up.',
    'Hedge trimmed to 2.5m along the boundary as requested. Client happy with the finish, asked about quarterly contract.',
    'Cleared blackberry and gorse from the rear section, chipped and removed all waste. Will need a follow-up spray in 4-6 weeks.',
    'Pruned roses and cleared leaf litter from all beds. Found some scale on the citrus tree — recommended treatment to client.',
    'Full grounds mow and tidy completed before school hours. Playground edges trimmed, all clippings removed.',
    'Planted native groundcovers as per design. Watered in thoroughly, advised client on watering schedule for first 6 weeks.',
    'Pruned three apple trees and the plum — removed deadwood and crossing branches. Light crop expected this season.',
    'Installed drip irrigation line to new garden bed, tested all zones. Left timer set to twice-weekly watering.',
  ]
  const jobNoteRows = noteJobs.map((job, i) => ({ job_id: job.id, content: NOTE_TEXTS[i % NOTE_TEXTS.length] }))
  await insertBatched('job_notes', jobNoteRows, false)

  // ── 12. Before/after photos on 6 completed jobs ───────────────────────────────
  const photoJobs = sampleDistinct(completedJobs, 6)
  const jobPhotoRows = []
  photoJobs.forEach((job, i) => {
    jobPhotoRows.push({ job_id: job.id, url: `https://picsum.photos/800/600?random=${i * 2 + 1}`, tag: 'before' })
    jobPhotoRows.push({ job_id: job.id, url: `https://picsum.photos/800/600?random=${i * 2 + 2}`, tag: 'after' })
  })
  await insertBatched('job_photos', jobPhotoRows, false)

  console.log('\n✓ Demo rebuild complete — Wakatipu Landscaping data loaded.')
  console.log(`  staff: ${staff.length} | clients: ${clients.length} | sites: ${sites.length} | jobs: ${jobs.length}`)
  console.log(`  quotes: ${quotes.length} | invoices: ${invoiceRows.length} | leads: 8`)
}

run().catch(err => {
  console.error('\n✗ Demo rebuild failed:', err.message)
  process.exit(1)
})
