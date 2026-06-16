// Bulk seed script — ADDITIVE (does not delete existing data).
// Generates ~6 months of realistic job/quote/invoice/notification volume
// for Wakatipu Landscaping, with seasonal variation (fewer jobs in NZ
// winter months June/July) and 5-6 active days per week.
//
// Run: node seed-bulk-data.js

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://zboasyacebclnwwzylrp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_-60ItyYDk4f_HQIWax989A_SxcpEBkK'

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── helpers ──────────────────────────────────────────────────────────────────

function rand(min, max) { return Math.random() * (max - min) + min }
function randInt(min, max) { return Math.floor(rand(min, max + 1)) }
function pick(arr) { return arr[randInt(0, arr.length - 1)] }
function pickWeighted(weighted) {
  // weighted: [[value, weight], ...]
  const total = weighted.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [value, w] of weighted) {
    if (r < w) return value
    r -= w
  }
  return weighted[weighted.length - 1][0]
}
function dateStr(d) { return d.toISOString().split('T')[0] }
function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c }

async function insertBatched(table, rows, batchSize = 500, returning = false) {
  const out = []
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const q = sb.from(table).insert(chunk)
    const { data, error } = returning ? await q.select() : await q
    if (error) throw new Error(`${table} insert (batch ${i / batchSize + 1}): ${error.message}`)
    if (returning && data) out.push(...data)
    process.stdout.write(`\r  ${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length}`)
  }
  console.log()
  return out
}

// ── reference data ────────────────────────────────────────────────────────────

const TODAY = new Date() // 2026-06-17 per environment
const RANGE_START = new Date(TODAY.getFullYear(), TODAY.getMonth() - 4, 1) // Feb 1
const RANGE_END   = new Date(TODAY.getFullYear(), TODAY.getMonth() + 2, 0) // Jul 31 (end of month)

const MONTH_MULTIPLIER = { 1: 1.0, 2: 1.0, 3: 0.9, 4: 0.8, 5: 0.5, 6: 0.45 } // months-from-range-start index unused; keyed by JS month below
function monthMultiplierFor(month) {
  // month: 0=Jan..11=Dec. Winter dip in NZ June(5)/July(6).
  if (month === 5) return 0.5   // June
  if (month === 6) return 0.45  // July
  if (month === 4) return 0.8   // May tapering down
  if (month === 3) return 0.9   // April tapering down
  return 1.0                    // Feb, Mar at full demand
}

const FIRST_NAMES = ['Margaret','David','Rachel','Claire','Tom','Steph','Ben','Sarah','Mark','Jess','Liam','Olivia','Noah','Emma','James','Grace','Henry','Chloe','Jack','Mia','Sam','Lucy','Ethan','Sophie','Oliver','Ruby','Daniel','Holly','Matt','Anna','Ryan','Kate','Josh','Megan','Nathan','Zoe','Adam','Ella','Connor','Maya']
const LAST_NAMES = ['Thompson','Ng','Sorenson','Hurst','Hargreaves','Mannering','Whitfield','Patel','Robertson','Mitchell','Fraser','Calder','Burnett','Stace','Holloway','Anderson','Cooper','Reid','Stewart','Walsh','Henderson','Marsh','Tindall','Frost','Paterson','Gallagher','Webb','Sinclair','Lowe','Bishop']
const BUSINESS_NAMES = ['Frankton Park School','Cardrona Alpine Resort','Remarkables Lodge','Lake Hayes Estate','Queenstown Gardens Trust','Wanaka Medical Centre','Shotover Primary School','Arrowtown Retirement Village','Five Mile Holdings','Glenorchy Lodge','Millbrook Resort','Coronet Peak Holdings','Kelvin Heights Golf Club','Jacks Point Residents Assoc','Hawea Flat Vineyard']
const STREETS = ['Panorama Terrace','Aubrey Road','School Road','Hallenstein Street','Gorge Road','Frankton Road','Lake Esplanade','Malaghans Road','Lower Shotover Road','Centennial Avenue','Brownston Street','Cardrona Valley Road','Plantation Road','Littles Road','Suburb Street','Robins Road','Speargrass Flat Road']
const SUBURBS = ['Queenstown 9300', 'Wanaka 9305', 'Arrowtown 9302', 'Frankton, Queenstown 9300', 'Lake Hayes 9371']

const JOB_TYPES = ['Lawn Mowing', 'Hedge Trimming', 'Garden Maintenance', 'Landscaping Install', 'Section Clearance', 'Weed Spray', 'Tree Pruning', 'Garden Tidy']
const TITLE_TEMPLATES = {
  'Lawn Mowing':         ['Weekly Lawn Mow', 'Lawn Mow & Edge', 'Mow & Trim'],
  'Hedge Trimming':      ['Hedge Trim', 'Boundary Hedge Trim', 'Box Hedge Tidy'],
  'Garden Maintenance':  ['Garden Tidy & Weed', 'Garden Maintenance Visit', 'Bed Maintenance'],
  'Landscaping Install': ['Garden Redesign Install', 'Native Planting Install', 'Retaining Wall & Planting'],
  'Section Clearance':   ['Section Clearance', 'Overgrowth Clearance', 'Blackberry & Gorse Clearance'],
  'Weed Spray':          ['Weed Spray Treatment', 'Hard Surface Spray'],
  'Tree Pruning':        ['Tree Pruning', 'Fruit Tree Prune'],
  'Garden Tidy':         ['Seasonal Garden Tidy', 'Pre-Winter Tidy'],
}

async function run() {
  console.log('=== Bulk seed: Wakatipu Landscaping (additive) ===\n')
  console.log(`Range: ${dateStr(RANGE_START)} -> ${dateStr(RANGE_END)} (today: ${dateStr(TODAY)})\n`)

  // ── 1. Ensure enough staff exist ──────────────────────────────────────────
  const { data: existingStaff } = await sb.from('staff').select('id, name, email, role')
  const existingStaffEmails = new Set((existingStaff ?? []).map(s => s.email))

  const newStaffCandidates = [
    { name: 'Jordan Reeve',  email: 'jordan@wakatipulandscaping.co.nz',  phone: '021 111 2222', role: 'field', pay_rate: 30, is_active: true },
    { name: 'Cody Marsh',    email: 'cody@wakatipulandscaping.co.nz',    phone: '021 222 3333', role: 'field', pay_rate: 29, is_active: true },
    { name: 'Briar Holland', email: 'briar@wakatipulandscaping.co.nz',   phone: '021 333 4444', role: 'field', pay_rate: 31, is_active: true },
    { name: 'Toby Sinclair', email: 'toby@wakatipulandscaping.co.nz',    phone: '021 444 5555', role: 'field', pay_rate: 27, is_active: true },
    { name: 'Hana Wills',    email: 'hana@wakatipulandscaping.co.nz',    phone: '021 555 6666', role: 'field', pay_rate: 33, is_active: true },
  ].filter(s => !existingStaffEmails.has(s.email))

  let insertedStaff = []
  if (newStaffCandidates.length > 0) {
    insertedStaff = await insertBatched('staff', newStaffCandidates, 500, true)
  }
  const staffPool = [...(existingStaff ?? []), ...insertedStaff]
  console.log(`Staff pool: ${staffPool.length}\n`)

  // ── 2. Generate new clients ───────────────────────────────────────────────
  const { data: existingClients } = await sb.from('clients').select('id, name')

  const newClientRows = []
  const usedNames = new Set((existingClients ?? []).map(c => c.name))
  let residentialCount = 0
  while (residentialCount < 60) {
    const first = pick(FIRST_NAMES)
    const last = pick(LAST_NAMES)
    const name = `${first} ${last}`
    if (usedNames.has(name)) continue
    usedNames.add(name)
    residentialCount++
    const street = pick(STREETS)
    newClientRows.push({
      name,
      business_name: null,
      phone: `02${randInt(1, 9)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1, 999)}@${pick(['gmail.com', 'xtra.co.nz', 'outlook.com'])}`,
      address: `${randInt(1, 120)} ${street}, ${pick(SUBURBS)}`,
      notes: null,
      is_active: true,
    })
  }
  for (const biz of BUSINESS_NAMES) {
    if (usedNames.has(biz)) continue
    usedNames.add(biz)
    const contact = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
    newClientRows.push({
      name: contact,
      business_name: biz,
      phone: `03 ${randInt(400, 449)} ${randInt(1000, 9999)}`,
      email: `admin@${biz.toLowerCase().replace(/[^a-z]+/g, '')}.co.nz`,
      address: `${randInt(1, 50)} ${pick(STREETS)}, ${pick(SUBURBS)}`,
      notes: 'Commercial contract.',
      is_active: true,
    })
  }

  const insertedClients = await insertBatched('clients', newClientRows, 500, true)
  const clientPool = [...(existingClients ?? []).map(c => ({ ...c, business_name: null })), ...insertedClients]
  console.log(`Client pool: ${clientPool.length}\n`)

  // Weighted pool: first 25 clients are "regulars" and get picked more often
  const regulars = clientPool.slice(0, Math.min(25, clientPool.length))
  function pickClient() {
    return Math.random() < 0.65 ? pick(regulars) : pick(clientPool)
  }

  // ── 3. One site per new client ────────────────────────────────────────────
  const newSiteRows = insertedClients.map(c => ({
    client_id: c.id,
    address: c.address,
    location: null,
    access_notes: pick(['Side gate, usually unlocked.', 'Ring doorbell on arrival.', 'Gate code on file.', 'Contact client 30 mins before.', null]),
    hazard_notes: pick([null, null, 'Dog on property.', 'Steep section — care with machinery.', 'Irrigation lines near surface.']),
  }))
  const insertedSites = await insertBatched('sites', newSiteRows, 500, true)
  const sitesByClient = new Map()
  for (const s of insertedSites) {
    if (!sitesByClient.has(s.client_id)) sitesByClient.set(s.client_id, [])
    sitesByClient.get(s.client_id).push(s)
  }
  console.log(`Sites inserted: ${insertedSites.length}\n`)

  // ── 4. Generate jobs across the date range ────────────────────────────────
  const jobRows = []
  for (let d = new Date(RANGE_START); d <= RANGE_END; d = addDays(d, 1)) {
    const dow = d.getDay() // 0 = Sunday
    if (dow === 0) continue // always off
    if (dow === 6 && Math.random() < 0.45) continue // Saturday ~55% working (gives ~5-6 active days/week)

    const multiplier = monthMultiplierFor(d.getMonth())
    const jobsToday = Math.max(0, Math.round(35 * multiplier * rand(0.85, 1.15)))

    for (let i = 0; i < jobsToday; i++) {
      const client = pickClient()
      const sites = sitesByClient.get(client.id)
      const jobType = pick(JOB_TYPES)
      const scheduledDate = new Date(d)

      let status
      const daysFromToday = Math.round((scheduledDate - TODAY) / 86400000)
      if (daysFromToday < -1) {
        status = pickWeighted([['complete', 50], ['invoiced', 35], ['cancelled', 10], ['scheduled', 5]])
      } else if (daysFromToday >= -1 && daysFromToday <= 1) {
        status = pickWeighted([['in_progress', 40], ['scheduled', 45], ['complete', 15]])
      } else if (daysFromToday <= 14) {
        status = pickWeighted([['scheduled', 90], ['pending', 10]])
      } else {
        status = pickWeighted([['scheduled', 60], ['pending', 40]])
      }

      jobRows.push({
        title: pick(TITLE_TEMPLATES[jobType]),
        client_id: client.id,
        site_id: sites && sites.length > 0 ? pick(sites).id : null,
        staff_id: pick(staffPool).id,
        job_type: jobType,
        status,
        scheduled_date: dateStr(scheduledDate),
        completed_date: (status === 'complete' || status === 'invoiced') ? dateStr(scheduledDate) : null,
        notes: null,
        client_name: client.name, // local-only, stripped before insert
        client_business: client.business_name ?? null, // local-only
      })
    }
  }

  console.log(`Generated ${jobRows.length} jobs to insert\n`)

  const jobsForInsert = jobRows.map(({ client_name, client_business, ...rest }) => rest)
  const insertedJobs = await insertBatched('jobs', jobsForInsert, 500, true)
  console.log(`Jobs inserted: ${insertedJobs.length}\n`)

  // ── 5. Quotes for ~25% of jobs ────────────────────────────────────────────
  const quoteCandidates = insertedJobs.filter(() => Math.random() < 0.25)
  const quoteRows = quoteCandidates.map(job => {
    const status = pickWeighted([['draft', 15], ['sent', 25], ['accepted', 40], ['declined', 12], ['expired', 8]])
    const subtotal = Math.round(rand(200, 3000) * 100) / 100
    const gst = Math.round(subtotal * 0.15 * 100) / 100
    return {
      client_id: job.client_id,
      job_id: job.id,
      status,
      valid_until: dateStr(addDays(new Date(job.scheduled_date), 30)),
      notes: null,
      subtotal,
      gst,
      total: Math.round((subtotal + gst) * 100) / 100,
    }
  })
  await insertBatched('quotes', quoteRows, 500, false)
  console.log(`Quotes inserted: ${quoteRows.length}\n`)

  // ── 6. Invoices for invoiced/complete jobs ────────────────────────────────
  const invoiceCandidates = insertedJobs.filter(job => {
    if (job.status === 'invoiced') return true
    if (job.status === 'complete') return Math.random() < 0.5
    return false
  })
  const invoiceRows = invoiceCandidates.map(job => {
    const scheduled = new Date(job.scheduled_date)
    const dueDate = addDays(scheduled, 14)
    const dueInPast = dueDate < TODAY
    const status = dueInPast
      ? pickWeighted([['paid', 60], ['overdue', 25], ['sent', 10], ['cancelled', 5]])
      : pickWeighted([['sent', 70], ['draft', 30]])
    const amount = Math.round(rand(150, 3000) * 100) / 100
    const tax = Math.round(amount * 0.15 * 100) / 100
    const paidDate = status === 'paid'
      ? dateStr(addDays(dueDate, -randInt(0, 10)))
      : null
    return {
      client_id: job.client_id,
      job_id: job.id,
      quote_id: null,
      amount,
      tax,
      total: Math.round((amount + tax) * 100) / 100,
      status,
      due_date: dateStr(dueDate),
      paid_date: paidDate,
      notes: null,
    }
  })
  await insertBatched('invoices', invoiceRows, 500, false)
  console.log(`Invoices inserted: ${invoiceRows.length}\n`)

  // ── 7. Notifications ───────────────────────────────────────────────────────
  // The live `notifications` table has a check constraint allowing only
  // type IN ('completion', 'review_request') — confirmed by probing the
  // REST API directly. Other type values (job_confirmation, day_before_reminder,
  // invoice_overdue) exist only in the unrelated client_notification_settings
  // table's NOTIFICATION_TYPES list and will be rejected here.
  const notificationRows = []
  for (const job of insertedJobs) {
    if (!(job.status === 'complete' || job.status === 'invoiced')) continue
    if (Math.random() >= 0.6) continue
    const scheduled = new Date(job.scheduled_date)
    notificationRows.push({
      client_id: job.client_id,
      job_id: job.id,
      type: 'completion',
      status: 'sent',
      sent_at: scheduled.toISOString(),
      scheduled_for: scheduled.toISOString(),
      review_link: 'https://g.page/r/PLACEHOLDER/review',
    })
    if (Math.random() < 0.4) {
      notificationRows.push({
        client_id: job.client_id,
        job_id: job.id,
        type: 'review_request',
        status: 'sent',
        sent_at: addDays(scheduled, 1).toISOString(),
        scheduled_for: addDays(scheduled, 1).toISOString(),
        review_link: 'https://g.page/r/PLACEHOLDER/review',
      })
    }
  }

  await insertBatched('notifications', notificationRows, 500, false)
  console.log(`Notifications inserted: ${notificationRows.length}\n`)

  // ── 8. A few extra leads ──────────────────────────────────────────────────
  const { data: existingLeads } = await sb.from('leads').select('email')
  const existingLeadEmails = new Set((existingLeads ?? []).map(l => l.email))
  const leadRows = []
  for (let i = 0; i < 15; i++) {
    const first = pick(FIRST_NAMES)
    const last = pick(LAST_NAMES)
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1, 999)}@gmail.com`
    if (existingLeadEmails.has(email)) continue
    existingLeadEmails.add(email)
    leadRows.push({
      name: `${first} ${last}`,
      email,
      phone: `02${randInt(1, 9)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
      message: pick([
        'Looking for a quote on regular lawn mowing.',
        'Need a full section clearance before we list the property.',
        'Interested in a garden redesign for spring.',
        'Hedges along the boundary need trimming, when are you free?',
        'Can you do a one-off tidy before we host an event?',
      ]),
      source: pick(['Website', 'Referral', 'Facebook', 'Google']),
      status: pickWeighted([['new', 50], ['contacted', 30], ['converted', 15], ['lost', 5]]),
      notes: null,
    })
  }
  await insertBatched('leads', leadRows, 500, false)
  console.log(`Leads inserted: ${leadRows.length}\n`)

  console.log('✓ Bulk seed complete.')
}

run().catch(err => {
  console.error('\n✗ Bulk seed failed:', err.message)
  process.exit(1)
})
