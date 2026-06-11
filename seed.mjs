import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zboasyacebclnwwzylrp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_-60ItyYDk4f_HQIWax989A_SxcpEBkK'

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  console.log('=== Wakatipu Landscaping Seed ===\n')

  // ── 1. Delete existing data (FK-safe order) ──────────────────────────────
  const deleteTables = ['leads', 'invoices', 'quotes', 'job_notes', 'job_photos', 'job_staff', 'jobs', 'sites', 'clients', 'staff']
  for (const table of deleteTables) {
    const { error } = await sb.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error && error.code !== 'PGRST116') {
      console.warn(`  [warn] delete ${table}: ${error.message}`)
    } else {
      console.log(`  cleared: ${table}`)
    }
  }
  console.log()

  // ── 2. Staff ──────────────────────────────────────────────────────────────
  const { data: staff, error: staffErr } = await sb.from('staff').insert([
    {
      name: 'Charmila Paterson',
      email: 'charmila@wakatipulandscaping.co.nz',
      phone: '021 345 6789',
      role: 'admin',
      pay_rate: 95,
      is_active: true,
    },
    {
      name: 'Jake Tindall',
      email: 'jake@wakatipulandscaping.co.nz',
      phone: '021 456 7890',
      role: 'field',
      pay_rate: 32,
      is_active: true,
    },
    {
      name: 'Liam Frost',
      email: 'liam@wakatipulandscaping.co.nz',
      phone: '027 567 8901',
      role: 'field',
      pay_rate: 28,
      is_active: true,
    },
  ]).select()
  if (staffErr) throw new Error(`staff insert: ${staffErr.message}`)
  console.log(`  inserted ${staff.length} staff`)

  const charmila = staff.find(s => s.name === 'Charmila Paterson')
  const jake  = staff.find(s => s.name === 'Jake Tindall')
  const liam  = staff.find(s => s.name === 'Liam Frost')

  // ── 3. Clients ────────────────────────────────────────────────────────────
  const { data: clients, error: clientErr } = await sb.from('clients').insert([
    {
      name: 'Margaret Thompson',
      business_name: null,
      phone: '03 442 1234',
      email: 'mthompson@gmail.com',
      address: '14 Panorama Terrace, Queenstown 9300',
      notes: 'Prefers morning appointments. Has a golden retriever.',
      is_active: true,
    },
    {
      name: 'David Ng',
      business_name: null,
      phone: '027 234 5678',
      email: 'davidng@xtra.co.nz',
      address: '3 Aubrey Road, Wanaka 9305',
      notes: 'Remote property — confirm access gate code before each visit.',
      is_active: true,
    },
    {
      name: 'Te Rangi Parata',
      business_name: 'Frankton Park School',
      phone: '03 442 8800',
      email: 'admin@franktonparkschool.school.nz',
      address: '6 School Road, Frankton, Queenstown 9300',
      notes: 'School grounds. No work during school hours (8:30am–3pm term time).',
      is_active: true,
    },
    {
      name: 'Claire Hurst',
      business_name: 'Cardrona Alpine Resort',
      phone: '03 443 7341',
      email: 'operations@cardrona.com',
      address: '2 Mount Cardrona Station Road, Wanaka 9305',
      notes: 'Commercial contract — quarterly garden maintenance. Invoice to accounts payable.',
      is_active: true,
    },
    {
      name: 'Rachel Sorenson',
      business_name: null,
      phone: '021 890 1234',
      email: 'rachel.sorenson@outlook.com',
      address: '28 Hallenstein Street, Queenstown 9300',
      notes: 'New client from referral. Keen on full garden redesign next spring.',
      is_active: true,
    },
  ]).select()
  if (clientErr) throw new Error(`clients insert: ${clientErr.message}`)
  console.log(`  inserted ${clients.length} clients`)

  const [margaret, david, frankton, cardrona, rachel] = clients

  // ── 4. Sites (2 per client) ───────────────────────────────────────────────
  const { data: sites, error: siteErr } = await sb.from('sites').insert([
    // Margaret Thompson
    {
      client_id: margaret.id,
      address: '14 Panorama Terrace, Queenstown 9300',
      location: null,
      access_notes: 'Side gate on left, always unlocked.',
      hazard_notes: null,
    },
    {
      client_id: margaret.id,
      address: '8 Littles Road, Arrowtown 9302',
      location: null,
      access_notes: 'Key under front mat.',
      hazard_notes: 'Steep bank at rear — take care with machinery.',
    },
    // David Ng
    {
      client_id: david.id,
      address: '3 Aubrey Road, Wanaka 9305',
      location: null,
      access_notes: 'Gate code: 4821.',
      hazard_notes: 'Irrigation lines run under lawn — shallow in north corner.',
    },
    {
      client_id: david.id,
      address: '91 Plantation Road, Wanaka 9305',
      location: null,
      access_notes: 'Contact David 30 mins before arrival.',
      hazard_notes: null,
    },
    // Frankton Park School
    {
      client_id: frankton.id,
      address: '6 School Road, Frankton, Queenstown 9300',
      location: null,
      access_notes: 'Report to office on arrival. Work outside school hours only.',
      hazard_notes: 'Children present during term — no ride-on mowers near classrooms.',
    },
    {
      client_id: frankton.id,
      address: '12 School Road, Frankton, Queenstown 9300',
      location: null,
      access_notes: 'Overflow carpark area — access via rear lane.',
      hazard_notes: null,
    },
    // Cardrona Alpine Resort
    {
      client_id: cardrona.id,
      address: '2 Mount Cardrona Station Road, Wanaka 9305',
      location: null,
      access_notes: 'Check in at resort reception. Hi-vis required.',
      hazard_notes: 'Heavy vehicle traffic on main access road.',
    },
    {
      client_id: cardrona.id,
      address: 'Cardrona Hotel, 2312 Cardrona Valley Road, Wanaka 9305',
      location: null,
      access_notes: 'Speak to hotel manager (Josh) on arrival.',
      hazard_notes: 'Historic trees — do not prune without prior approval.',
    },
    // Rachel Sorenson
    {
      client_id: rachel.id,
      address: '28 Hallenstein Street, Queenstown 9300',
      location: null,
      access_notes: 'Ring doorbell, Rachel usually home.',
      hazard_notes: null,
    },
    {
      client_id: rachel.id,
      address: '5 Melbourne Street, Queenstown 9300',
      location: null,
      access_notes: 'Rental property — tenant will let you in. Notify Rachel day before.',
      hazard_notes: 'Ivy on fence — check for wasps before cutting.',
    },
  ]).select()
  if (siteErr) throw new Error(`sites insert: ${siteErr.message}`)
  console.log(`  inserted ${sites.length} sites`)

  // ── 5. Jobs ───────────────────────────────────────────────────────────────
  // Today: 2026-06-11 (Thursday). This week: June 11-14.
  const { data: jobs, error: jobErr } = await sb.from('jobs').insert([
    // 3 scheduled this week
    {
      title: 'Weekly Lawn Mow',
      client_id: margaret.id,
      site_id: sites[0].id,
      staff_id: jake.id,
      job_type: 'Lawn Mowing',
      status: 'scheduled',
      scheduled_date: '2026-06-11',
      notes: 'Front and back lawn. Edge along driveway.',
    },
    {
      title: 'School Grounds Mow & Tidy',
      client_id: frankton.id,
      site_id: sites[4].id,
      staff_id: liam.id,
      job_type: 'Lawn Mowing',
      status: 'scheduled',
      scheduled_date: '2026-06-12',
      notes: 'Full grounds mow. Trim edges around playground. Must finish before 8am.',
    },
    {
      title: 'Hedge Trim — Cardrona Hotel',
      client_id: cardrona.id,
      site_id: sites[7].id,
      staff_id: jake.id,
      job_type: 'Hedge Trimming',
      status: 'scheduled',
      scheduled_date: '2026-06-13',
      notes: 'Trim box hedges along main entrance. Do not touch historic totara.',
    },
    // 2 in progress
    {
      title: 'Native Garden Installation',
      client_id: rachel.id,
      site_id: sites[8].id,
      staff_id: charmila.id,
      job_type: 'Landscaping Install',
      status: 'in_progress',
      scheduled_date: '2026-06-09',
      notes: 'Stage 1: remove existing lawn and lay weed mat. Stage 2: plant native groundcovers.',
    },
    {
      title: 'Section Clearance — Wanaka',
      client_id: david.id,
      site_id: sites[2].id,
      staff_id: liam.id,
      job_type: 'Section Clearance',
      status: 'in_progress',
      scheduled_date: '2026-06-10',
      notes: 'Clear rear section of blackberry and gorse. Chip and remove all waste.',
    },
    // 3 complete
    {
      title: 'Autumn Garden Tidy',
      client_id: margaret.id,
      site_id: sites[1].id,
      staff_id: jake.id,
      job_type: 'Garden Maintenance',
      status: 'complete',
      scheduled_date: '2026-05-28',
      notes: 'Prune roses, clear leaf litter, weed all beds.',
    },
    {
      title: 'Quarterly Grounds Maintenance',
      client_id: cardrona.id,
      site_id: sites[6].id,
      staff_id: charmila.id,
      job_type: 'Garden Maintenance',
      status: 'complete',
      scheduled_date: '2026-05-15',
      notes: 'Full resort grounds maintenance. Mow, edge, weed, rubbish removal.',
    },
    {
      title: 'Lawson Cypress Hedge Trim',
      client_id: david.id,
      site_id: sites[3].id,
      staff_id: liam.id,
      job_type: 'Hedge Trimming',
      status: 'complete',
      scheduled_date: '2026-05-20',
      notes: 'Trim 40m of Lawson cypress hedge to 2.5m height.',
    },
    // 2 pending
    {
      title: 'Garden Redesign Consultation',
      client_id: rachel.id,
      site_id: sites[9].id,
      staff_id: charmila.id,
      job_type: 'Landscaping Install',
      status: 'pending',
      scheduled_date: null,
      notes: 'Awaiting client sign-off on design plans before scheduling install.',
    },
    {
      title: 'Overflow Carpark Weed Spray',
      client_id: frankton.id,
      site_id: sites[5].id,
      staff_id: jake.id,
      job_type: 'Section Clearance',
      status: 'pending',
      scheduled_date: null,
      notes: 'Quote accepted. Schedule once spray conditions allow (no rain 48hrs).',
    },
  ]).select()
  if (jobErr) throw new Error(`jobs insert: ${jobErr.message}`)
  console.log(`  inserted ${jobs.length} jobs`)

  // ── 6. Quotes ─────────────────────────────────────────────────────────────
  const { data: quotes, error: quoteErr } = await sb.from('quotes').insert([
    // draft
    {
      client_id: rachel.id,
      job_id: jobs[8].id,
      status: 'draft',
      valid_until: '2026-07-15',
      notes: 'Draft quote for full garden redesign at Melbourne St rental. Awaiting final plant list from Simon.',
      subtotal: 2850.00,
      gst: 427.50,
      total: 3277.50,
    },
    // sent
    {
      client_id: frankton.id,
      job_id: jobs[9].id,
      status: 'sent',
      valid_until: '2026-06-30',
      notes: 'Weed spray quote for overflow carpark area. Includes spot treatment of all hard surfaces.',
      subtotal: 480.00,
      gst: 72.00,
      total: 552.00,
    },
    // accepted
    {
      client_id: david.id,
      job_id: jobs[4].id,
      status: 'accepted',
      valid_until: '2026-06-20',
      notes: 'Accepted by David on 2026-06-03. Work commenced.',
      subtotal: 1260.00,
      gst: 189.00,
      total: 1449.00,
    },
  ]).select()
  if (quoteErr) throw new Error(`quotes insert: ${quoteErr.message}`)
  console.log(`  inserted ${quotes.length} quotes`)

  // Quote line items
  const lineItems = [
    // Quote 1 (draft — garden redesign)
    { quote_id: quotes[0].id, description: 'Labour — Site clearance (4 hrs @ $85/hr)', quantity: 4, unit_price: 85.00, amount: 340.00, sort_order: 1 },
    { quote_id: quotes[0].id, description: 'Labour — Planting & installation (8 hrs @ $85/hr)', quantity: 8, unit_price: 85.00, amount: 680.00, sort_order: 2 },
    { quote_id: quotes[0].id, description: 'Materials — Native plants (Hebe, Astelia, Carex)', quantity: 1, unit_price: 1200.00, amount: 1200.00, sort_order: 3 },
    { quote_id: quotes[0].id, description: 'Materials — Weed mat & bark mulch', quantity: 1, unit_price: 380.00, amount: 380.00, sort_order: 4 },
    { quote_id: quotes[0].id, description: 'Travel — Queenstown return', quantity: 2, unit_price: 125.00, amount: 250.00, sort_order: 5 },
    // Quote 2 (sent — weed spray)
    { quote_id: quotes[1].id, description: 'Labour — Weed spray (3 hrs @ $85/hr)', quantity: 3, unit_price: 85.00, amount: 255.00, sort_order: 1 },
    { quote_id: quotes[1].id, description: 'Materials — Herbicide (Roundup Pro)', quantity: 1, unit_price: 145.00, amount: 145.00, sort_order: 2 },
    { quote_id: quotes[1].id, description: 'Travel — Frankton return', quantity: 1, unit_price: 80.00, amount: 80.00, sort_order: 3 },
    // Quote 3 (accepted — section clearance)
    { quote_id: quotes[2].id, description: 'Labour — Section clearance (10 hrs @ $85/hr)', quantity: 10, unit_price: 85.00, amount: 850.00, sort_order: 1 },
    { quote_id: quotes[2].id, description: 'Materials — Disposal/skip bin hire', quantity: 1, unit_price: 280.00, amount: 280.00, sort_order: 2 },
    { quote_id: quotes[2].id, description: 'Travel — Wanaka return (x2 days)', quantity: 2, unit_price: 65.00, amount: 130.00, sort_order: 3 },
  ]

  const { error: lineErr } = await sb.from('quote_line_items').insert(lineItems)
  if (lineErr) throw new Error(`quote_line_items insert: ${lineErr.message}`)
  console.log(`  inserted ${lineItems.length} quote line items`)

  // ── 7. Invoices ───────────────────────────────────────────────────────────
  const { error: invErr } = await sb.from('invoices').insert([
    // paid
    {
      client_id: cardrona.id,
      job_id: jobs[6].id,
      quote_id: null,
      amount: 1950.00,
      tax: 292.50,
      total: 2242.50,
      status: 'paid',
      due_date: '2026-06-05',
      notes: 'Quarterly grounds maintenance — May 2026. Paid via bank transfer 2026-06-04.',
    },
    // sent
    {
      client_id: margaret.id,
      job_id: jobs[5].id,
      quote_id: null,
      amount: 320.00,
      tax: 48.00,
      total: 368.00,
      status: 'sent',
      due_date: '2026-06-25',
      notes: 'Autumn garden tidy — Arrowtown site.',
    },
    // overdue
    {
      client_id: david.id,
      job_id: jobs[7].id,
      quote_id: quotes[2].id,
      amount: 1260.00,
      tax: 189.00,
      total: 1449.00,
      status: 'overdue',
      due_date: '2026-06-01',
      notes: 'Hedge trimming — Plantation Rd. Payment overdue. Follow up required.',
    },
  ])
  if (invErr) throw new Error(`invoices insert: ${invErr.message}`)
  console.log(`  inserted 3 invoices`)

  // ── 8. Leads ──────────────────────────────────────────────────────────────
  const { error: leadErr } = await sb.from('leads').insert([
    // new
    {
      name: 'Ben Whitfield',
      email: 'bwhitfield@gmail.com',
      phone: '021 678 9012',
      message: "Hi, I've just moved into a property on Gorge Road and the garden is completely overgrown. Looking for someone to do a full section clearance and then regular maintenance. Happy to chat about a quote.",
      source: 'Website',
      status: 'new',
      notes: null,
    },
    // contacted
    {
      name: 'Steph Mannering',
      email: 'steph.mannering@xtra.co.nz',
      phone: '027 345 6789',
      message: "We have a large property in Wanaka with extensive gardens. Interested in getting a quote for ongoing monthly maintenance and possibly a spring planting project.",
      source: 'Referral',
      status: 'contacted',
      notes: 'Called 2026-06-09. Sent quote request form. Following up next week.',
    },
    // converted
    {
      name: 'Tom Hargreaves',
      email: 'tom.h@hotmail.com',
      phone: '03 443 0987',
      message: "Interested in getting my lawns mowed weekly during summer. Two properties in Queenstown CBD.",
      source: 'Facebook',
      status: 'converted',
      notes: 'Converted to client. Ongoing weekly mowing contract starting June 2026.',
    },
  ])
  if (leadErr) throw new Error(`leads insert: ${leadErr.message}`)
  console.log(`  inserted 3 leads`)

  console.log('\n✓ Seed complete — Wakatipu Landscaping data loaded.')
}

run().catch(err => {
  console.error('\n✗ Seed failed:', err.message)
  process.exit(1)
})
