import Link from 'next/link'
import { StatusBadge, statusDot } from '@/app/components/ui/Badge'
import { colorForStaff } from '@/app/components/schedule/scheduleColors'

export type TimelineJob = {
  id: string
  title: string | null
  job_type: string | null
  status: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  staff_id: string | null
  clients: { name: string } | null
  staff: { name: string } | null
}

const DAY_START = 6   // 6 AM
const DAY_END = 18    // 6 PM
const SPAN = DAY_END - DAY_START

function toHours(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h + (Number.isNaN(m) ? 0 : m) / 60
}

function fmtTime(t: string | null): string {
  const h = toHours(t)
  if (h == null) return '—'
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  const suffix = whole >= 12 ? 'pm' : 'am'
  const h12 = whole % 12 === 0 ? 12 : whole % 12
  return mins ? `${h12}:${String(mins).padStart(2, '0')}${suffix}` : `${h12}${suffix}`
}

function initials(name: string | null | undefined): string {
  return (name ?? '?').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

interface Props {
  jobs: TimelineJob[]
  /** Server render time, used to draw the "now" marker. */
  now: Date
}

// A compact 6am–6pm strip with each of today's jobs placed by its start/end
// time, followed by the job list. Pure server markup — no chart runtime.
export default function TodayTimeline({ jobs, now }: Props) {
  const nowH = now.getHours() + now.getMinutes() / 60
  const nowPct = ((nowH - DAY_START) / SPAN) * 100
  const showNow = nowPct >= 0 && nowPct <= 100
  const hours = Array.from({ length: SPAN + 1 }, (_, i) => DAY_START + i)

  // Jobs with a usable time slot are drawn on the strip; untimed ones only
  // appear in the list below.
  const timed = jobs
    .map(job => {
      const s = toHours(job.start_time)
      const e = toHours(job.end_time) ?? (s != null ? s + 2 : null)
      if (s == null || e == null) return null
      const left = Math.max(0, ((s - DAY_START) / SPAN) * 100)
      const right = Math.min(100, ((e - DAY_START) / SPAN) * 100)
      return { job, left, width: Math.max(4, right - left) }
    })
    .filter((x): x is { job: TimelineJob; left: number; width: number } => x !== null)

  // Stack overlapping blocks onto separate lanes.
  const lanes: number[] = []
  const placed = timed.map(t => {
    let lane = lanes.findIndex(end => end <= t.left)
    if (lane === -1) { lane = lanes.length; lanes.push(0) }
    lanes[lane] = t.left + t.width
    return { ...t, lane }
  })
  const laneCount = Math.max(1, lanes.length)

  return (
    <div>
      {/* Strip */}
      <div className="px-5 pt-4 pb-3">
        <div className="relative" style={{ height: 22 + laneCount * 30 }}>
          {/* hour ticks */}
          {hours.map((h, i) => {
            const pct = (i / SPAN) * 100
            const label = h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`
            return (
              <div key={h} className="absolute top-0 bottom-0" style={{ left: `${pct}%` }}>
                <div className="absolute top-5 bottom-0 border-l border-dashed border-line" />
                {i % 2 === 0 && (
                  <span className="absolute -translate-x-1/2 text-[10px] font-medium text-ink-faint tabular-nums">{label}</span>
                )}
              </div>
            )
          })}

          {/* job blocks */}
          {placed.map(({ job, left, width, lane }) => {
            const color = colorForStaff(job.staff_id)
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                title={`${job.title ?? job.job_type ?? 'Job'} · ${fmtTime(job.start_time)}–${fmtTime(job.end_time)}`}
                className="absolute h-[26px] rounded-md flex items-center gap-1.5 px-2 text-[11px] font-semibold text-ink overflow-hidden transition-[filter] hover:brightness-95"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: 24 + lane * 30,
                  background: `rgba(${color.rgb}, 0.16)`,
                  boxShadow: `inset 3px 0 0 ${color.solid}`,
                }}
              >
                <span className="truncate">{job.title ?? job.job_type ?? 'Job'}</span>
              </Link>
            )
          })}

          {/* now marker */}
          {showNow && (
            <div className="absolute top-4 bottom-0 w-px bg-accent" style={{ left: `${nowPct}%` }}>
              <span className="absolute -top-1 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-white" />
            </div>
          )}
        </div>
      </div>

      {/* List */}
      {jobs.length === 0 ? (
        <div className="px-5 py-8 text-center border-t border-line-soft">
          <p className="text-sm font-medium text-ink">Nothing on the board today</p>
          <p className="text-xs text-ink-muted mt-1">Jobs scheduled for today will show up here with their time slots.</p>
        </div>
      ) : (
        <ul className="border-t border-line-soft divide-y divide-line-soft">
          {jobs.map(job => {
            const color = colorForStaff(job.staff_id)
            return (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="group flex items-center gap-4 px-5 py-3 hover:bg-surface-hover transition-colors">
                  <div className="w-[76px] shrink-0">
                    <p className="text-sm font-semibold text-ink tabular-nums leading-tight">{fmtTime(job.start_time)}</p>
                    <p className="text-[11px] text-ink-faint tabular-nums">to {fmtTime(job.end_time)}</p>
                  </div>
                  <span aria-hidden className="w-1.5 h-9 rounded-full shrink-0" style={{ background: statusDot(job.status) }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate group-hover:text-accent transition-colors">
                      {job.title ?? job.job_type ?? 'Untitled job'}
                    </p>
                    <p className="text-xs text-ink-muted truncate mt-0.5">
                      {job.clients?.name ?? 'No client'}
                      {job.job_type && job.title ? ` · ${job.job_type}` : ''}
                      {job.location ? ` · ${job.location}` : ''}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: color.solid }}
                      title={job.staff?.name ?? 'Unassigned'}
                    >
                      {initials(job.staff?.name)}
                    </span>
                    <span className="text-xs text-ink-muted max-w-[110px] truncate">{job.staff?.name ?? 'Unassigned'}</span>
                  </div>
                  <StatusBadge status={job.status} className="shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
