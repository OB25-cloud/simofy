// Moves a hand-picked set of EXISTING demo jobs into the current week so the
// Schedule page looks active for a live demo, without inserting any new rows.
//
// Only UPDATEs jobs.scheduled_date / start_time / end_time for a fixed list
// of job ids below — never creates jobs, never touches staff_id, client_id,
// status, or anything else. Safe to re-run: it always converges on the same
// target dates/times (idempotent), it just re-applies them.
//
// Why start_time/end_time are touched too, not scheduled_date alone: almost
// every seeded job shares the same 08:00:00 start time, so "spread across
// different times of day" for the current week can't be achieved by moving
// dates alone — a deliberate, narrow exception to "update dates only".
//
// "Current week" here is Mon 17 Aug – Sun 23 Aug 2026 (the Monday-start week
// that actually contains today, 2026-08-23, a Sunday) — not Mon 18 – Sun 24
// as originally requested, which doesn't land on a Monday-Sunday boundary at
// all. "Next week" (Mon 24 – Sun 30 Aug) already has 7 jobs spread across 5
// staff from the original seed run, comfortably inside the 6-8 target, so it
// isn't touched.
//
// Candidates were chosen only from jobs with status 'scheduled' or 'pending'
// — moving a 'complete'/'invoiced'/'in_progress' job would misrepresent
// already-actioned history as upcoming work.

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const env = {}
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Moves into the current week (Mon 17 – Sun 23 Aug 2026). Combined with the
// 3 jobs already sitting on 22/23 Aug from the original seed, this brings
// the week to 10 jobs across 9 different staff members.
const CURRENT_WEEK_MOVES = [
  { id: '5787d97c-901b-44c9-907e-4cdcd784e569', label: 'Emma Bright · Box Hedge Tidy', scheduled_date: '2026-08-17', start_time: '08:00:00', end_time: '10:00:00' },
  { id: '86fca062-8947-4ca7-b30a-61ed2398eaf0', label: 'Cody Marsh · Deciduous Tree Prune', scheduled_date: '2026-08-17', start_time: '13:00:00', end_time: '15:30:00' },
  { id: 'd05e405a-65ff-4ffd-9d79-527db1242d24', label: 'Ben Hawke · Retaining Wall & Planting', scheduled_date: '2026-08-18', start_time: '09:30:00', end_time: '12:00:00' },
  { id: '1317384f-efef-4b20-9c91-b079c6ce88ef', label: 'Liam Foster · Garden Tidy & Weed', scheduled_date: '2026-08-19', start_time: '07:30:00', end_time: '09:00:00' },
  { id: '22899b8f-218c-40c3-a953-d918a7592319', label: 'Mia Chen · Weekly Lawn Mow', scheduled_date: '2026-08-19', start_time: '14:00:00', end_time: '15:30:00' },
  { id: '17d21a5d-2fdd-47fd-95d4-acbcf3dd7b70', label: 'Jake Tindall · Lawn Mow & Edge', scheduled_date: '2026-08-20', start_time: '10:00:00', end_time: '11:30:00' },
  { id: '1556d2dc-3be4-4b89-8698-8e91e4971b97', label: 'Manaia Wetere · Section Clearance', scheduled_date: '2026-08-21', start_time: '08:30:00', end_time: '11:00:00' },
]

async function main() {
  console.log(`Applying ${CURRENT_WEEK_MOVES.length} reschedules...\n`)

  for (const move of CURRENT_WEEK_MOVES) {
    const { error } = await supabase
      .from('jobs')
      .update({ scheduled_date: move.scheduled_date, start_time: move.start_time, end_time: move.end_time })
      .eq('id', move.id)

    if (error) {
      console.error(`FAILED  ${move.label} (${move.id}):`, error.message)
    } else {
      console.log(`OK      ${move.scheduled_date} ${move.start_time.slice(0, 5)}-${move.end_time.slice(0, 5)}  ${move.label}`)
    }
  }

  const { data: verify, error: verifyErr } = await supabase
    .from('jobs')
    .select('scheduled_date, start_time, staff(name), title, job_type')
    .gte('scheduled_date', '2026-08-17')
    .lt('scheduled_date', '2026-08-31')
    .order('scheduled_date')

  if (verifyErr) {
    console.error('\nVerification query failed:', verifyErr.message)
    return
  }

  const currentWeek = verify.filter(j => j.scheduled_date < '2026-08-24')
  const nextWeek = verify.filter(j => j.scheduled_date >= '2026-08-24')

  console.log(`\nCurrent week (17-23 Aug): ${currentWeek.length} jobs`)
  currentWeek.forEach(j => console.log(`  ${j.scheduled_date} ${j.start_time.slice(0, 5)}  ${(j.staff && j.staff.name) || 'Unassigned'}  ${j.title || j.job_type}`))

  console.log(`\nNext week (24-30 Aug): ${nextWeek.length} jobs`)
  nextWeek.forEach(j => console.log(`  ${j.scheduled_date} ${j.start_time.slice(0, 5)}  ${(j.staff && j.staff.name) || 'Unassigned'}  ${j.title || j.job_type}`))
}

main()
