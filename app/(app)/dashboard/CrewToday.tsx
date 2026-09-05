import Link from 'next/link'
import { colorForStaff } from '@/app/components/schedule/scheduleColors'

export type CrewMember = {
  id: string
  name: string
  jobs: number
  firstStart: string | null
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function fmtTime(t: string | null): string | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return null
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`
}

interface Props {
  crew: CrewMember[]
  totalActive: number
  unassignedJobs: number
}

// Who is out on jobs today, framed against the whole active team.
export default function CrewToday({ crew, totalActive, unassignedJobs }: Props) {
  const pct = totalActive > 0 ? Math.round((crew.length / totalActive) * 100) : 0
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[30px] leading-none font-bold tracking-tight tabular-nums text-ink">
              {crew.length}
              <span className="text-base font-semibold text-ink-faint"> / {totalActive}</span>
            </p>
            <p className="text-xs text-ink-muted mt-1.5">crew scheduled today</p>
          </div>
          {unassignedJobs > 0 ? (
            <Link href="/schedule" className="text-[11px] font-semibold px-2 py-1 rounded-md bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25 hover:bg-amber-100 transition-colors">
              {unassignedJobs} unassigned
            </Link>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-accent-soft text-accent">All assigned</span>
          )}
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-surface-muted overflow-hidden">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {crew.length === 0 ? (
        <div className="px-5 pb-6 pt-1 flex-1">
          <p className="text-sm font-medium text-ink">No one is rostered today</p>
          <p className="text-xs text-ink-muted mt-1">Assign staff to today&apos;s jobs from the schedule.</p>
        </div>
      ) : (
        <ul className="border-t border-line-soft divide-y divide-line-soft flex-1">
          {crew.map(member => {
            const color = colorForStaff(member.id)
            const start = fmtTime(member.firstStart)
            return (
              <li key={member.id} className="flex items-center gap-3 px-5 py-2.5">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ring-2 ring-white shadow-[0_0_0_1px_rgba(17,24,39,0.06)]"
                  style={{ background: color.solid }}
                >
                  {initials(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{member.name}</p>
                  <p className="text-[11px] text-ink-muted truncate">
                    {member.jobs} {member.jobs === 1 ? 'job' : 'jobs'}{start ? ` · first at ${start}` : ''}
                  </p>
                </div>
                <span className="w-2 h-2 rounded-full bg-accent shrink-0" title="On the roster today" />
              </li>
            )
          })}
        </ul>
      )}

      <div className="px-5 py-3 border-t border-line-soft">
        <Link href="/staff" className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors">
          View full team →
        </Link>
      </div>
    </div>
  )
}
