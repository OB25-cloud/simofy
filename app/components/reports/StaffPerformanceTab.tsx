'use client'

import ChartCard from './ChartCard'
import { HBarChart } from './PremiumCharts'
import { moneyFormatter, compactMoneyFormatter } from './chartTheme'
import { colorForStaff } from '@/app/components/schedule/scheduleColors'
import type { StaffPerfRow } from './types'

const money = (v: number) => moneyFormatter.format(v)
const compact = (v: number) => compactMoneyFormatter.format(v)

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function StaffPerformanceTab({ data }: { data: StaffPerfRow[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card py-16 text-center">
        <p className="text-sm font-semibold text-ink">No active staff to report on</p>
        <p className="text-xs text-ink-muted mt-1">Add team members on the Staff page to see their performance here.</p>
      </div>
    )
  }

  const withRevenue = data.filter(s => s.revenue > 0)
  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0)
  const leader = data[0]
  const totalCompleted = data.reduce((s, r) => s + r.jobsCompleted, 0)

  return (
    <div className="space-y-4">
      <ChartCard
        title="Revenue by staff"
        subtitle={leader && leader.revenue > 0 ? `${leader.name} leads with ${money(leader.revenue)} · colours match the scheduler` : 'No paid revenue attributed to staff yet'}
        headline={money(totalRevenue)}
        headlineSub={`across ${withRevenue.length} ${withRevenue.length === 1 ? 'person' : 'people'}`}
        height={Math.max(260, 40 + withRevenue.length * 34)}
      >
        <HBarChart
          data={(withRevenue.length > 0 ? withRevenue : data.slice(0, 8)).map(s => ({ label: s.name, value: s.revenue, color: s.id ? colorForStaff(s.id).solid : undefined }))}
          format={money}
          axisFormat={compact}
          seriesLabel="revenue"
          gradientId="staff-rev"
          labelWidth={130}
          fade={false}
        />
      </ChartCard>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line-soft">
          <h2 className="text-[13px] font-semibold text-ink">Team scoreboard</h2>
          <span className="text-xs text-ink-faint tabular-nums">{data.length} active · {totalCompleted} jobs completed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                {[
                  { label: 'Staff', cls: 'pl-5 pr-4 text-left' },
                  { label: 'Assigned', cls: 'px-4 text-right' },
                  { label: 'Completed', cls: 'px-4 text-right' },
                  { label: 'Completion', cls: 'px-4 text-left w-[180px]' },
                  { label: 'Revenue', cls: 'px-4 text-right' },
                  { label: 'Avg job value', cls: 'pl-4 pr-5 text-right' },
                ].map(col => (
                  <th key={col.label} className={['py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted bg-surface-muted border-b border-line', col.cls].join(' ')}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const color = row.id ? colorForStaff(row.id) : { solid: '#94a3b8' }
                const rate = row.jobsAssigned > 0 ? Math.round((row.jobsCompleted / row.jobsAssigned) * 100) : 0
                const share = totalRevenue > 0 ? Math.round((row.revenue / totalRevenue) * 100) : 0
                return (
                  <tr key={row.id ?? row.name} className="group border-b border-line-soft last:border-b-0 hover:bg-surface-hover transition-colors">
                    <td className="pl-5 pr-4 py-3 align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] font-semibold text-ink-faint tabular-nums w-4 text-right">{i + 1}</span>
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white shrink-0 ring-2 ring-white shadow-[0_0_0_1px_rgba(17,24,39,0.06)]" style={{ background: color.solid }}>{initials(row.name)}</span>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink truncate leading-tight">{row.name}</p>
                          <p className="text-[11px] text-ink-muted mt-0.5">{share > 0 ? `${share}% of team revenue` : 'No paid revenue yet'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-[13px] text-ink-muted tabular-nums">{row.jobsAssigned}</td>
                    <td className="px-4 py-3 align-middle text-right text-[13px] font-semibold text-ink tabular-nums">{row.jobsCompleted}</td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${rate}%`, background: color.solid }} />
                        </div>
                        <span className="text-[11px] text-ink-muted tabular-nums w-8 text-right">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-[14px] font-bold text-ink tabular-nums">{money(row.revenue)}</td>
                    <td className="pl-4 pr-5 py-3 align-middle text-right font-mono text-[12.5px] text-ink-muted tabular-nums">{row.avgJobValue > 0 ? money(row.avgJobValue) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
