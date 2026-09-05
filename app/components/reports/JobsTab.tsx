'use client'

import ChartCard from './ChartCard'
import { TrendChart, VBarChart } from './PremiumCharts'
import { STATUS_ON_DARK } from './chartTheme'
import type { JobsStatsData } from './types'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  complete: 'Completed',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
}
const STATUS_ORDER = ['complete', 'invoiced', 'in_progress', 'scheduled', 'pending', 'cancelled']

function Mini({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'accent' }) {
  return (
    <div className="relative bg-surface rounded-xl border border-line shadow-card px-4 py-3 overflow-hidden">
      <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', tone === 'accent' ? 'bg-accent' : 'bg-line'].join(' ')} />
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
      <p className="mt-1.5 text-[22px] leading-none font-bold tracking-tight tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-ink-muted truncate">{sub}</p>}
    </div>
  )
}

export default function JobsTab({ data }: { data: JobsStatsData }) {
  const statusData = [...data.byStatus]
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    .map(s => ({ label: STATUS_LABEL[s.status] ?? s.status, value: s.count, color: STATUS_ON_DARK[s.status] ?? STATUS_ON_DARK.pending }))
  const peak = data.completedByMonth.reduce((best, m) => (m.count > best.count ? m : best), data.completedByMonth[0] ?? { month: '—', count: 0 })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Mini label="Total jobs" value={String(data.total)} sub="scheduled in the last 12 months" tone="accent" />
        <Mini label="Completed" value={String(data.completed)} sub={`${data.cancelled} cancelled`} />
        <Mini label="Completion rate" value={`${data.completionRate}%`} sub="of all jobs in window" tone="accent" />
        <Mini label="Avg per week" value={String(data.avgPerWeek)} sub="jobs scheduled" />
      </div>

      <ChartCard
        title="Jobs completed by month"
        subtitle={peak.count > 0 ? `Peak ${peak.month} · ${peak.count} jobs` : 'No completed jobs in the last 12 months'}
        headline={String(data.completed)}
        headlineSub="completed"
        height={300}
      >
        <TrendChart
          data={data.completedByMonth.map(m => ({ month: m.month, value: m.count }))}
          format={v => `${v} ${v === 1 ? 'job' : 'jobs'}`}
          axisFormat={v => String(v)}
          seriesLabel="completed"
          gradientId="jobs-month"
        />
      </ChartCard>

      <ChartCard title="Jobs by status" subtitle={`${data.total} jobs in window · coloured by status`} height={300}>
        <div className="flex h-full flex-col">
          <div className="flex-1 min-h-0">
            <VBarChart data={statusData} format={v => `${v} ${v === 1 ? 'job' : 'jobs'}`} axisFormat={v => String(v)} seriesLabel="jobs" />
          </div>
          <ul className="shrink-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-3 pt-2">
            {statusData.map(s => (
              <li key={s.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label} <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>
    </div>
  )
}
