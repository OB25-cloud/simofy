'use client'

import ChartCard from './ChartCard'
import { TrendChart, HBarChart } from './PremiumCharts'
import type { ProfitabilityData } from './types'

const pct = (v: number) => `${v}%`

function Mini({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'accent' | 'danger' }) {
  return (
    <div className="relative bg-surface rounded-xl border border-line shadow-card px-4 py-3 overflow-hidden">
      <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', tone === 'accent' ? 'bg-accent' : tone === 'danger' ? 'bg-error' : 'bg-line'].join(' ')} />
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
      <p className={['mt-1.5 text-[22px] leading-none font-bold tracking-tight tabular-nums truncate', tone === 'danger' ? 'text-error' : 'text-ink'].join(' ')}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-ink-muted truncate">{sub}</p>}
    </div>
  )
}

export default function ProfitabilityTab({ data }: { data: ProfitabilityData }) {
  const best = data.byJobType[0]
  const worst = data.byJobType[data.byJobType.length - 1]
  const monthsWithData = data.byMonth.filter(m => m.margin !== 0)
  const peak = monthsWithData.reduce((b, m) => (m.margin > b.margin ? m : b), monthsWithData[0] ?? { month: '—', margin: 0 })

  // Bars fade from best to tightest; anything under 10% is flagged red so a
  // thin margin is visible at a glance, not just on hover.
  const bars = data.byJobType.map(d => ({ label: d.jobType, value: d.margin, color: d.margin < 10 ? '#f87171' : undefined }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <Mini label="Avg margin" value={data.avgMargin != null ? pct(data.avgMargin) : '—'} sub="completed jobs, last 12 months" tone={data.avgMargin != null && data.avgMargin < 10 ? 'danger' : 'accent'} />
        <Mini label="Best job type" value={best?.jobType ?? '—'} sub={best ? `${best.margin}% margin` : 'No margin data yet'} tone="accent" />
        <Mini label="Tightest job type" value={worst?.jobType ?? '—'} sub={worst ? `${worst.margin}% margin` : 'No margin data yet'} tone={worst && worst.margin < 10 ? 'danger' : 'default'} />
      </div>

      <ChartCard
        title="Margin trend"
        subtitle={monthsWithData.length > 0 ? `Peak ${peak.month} · ${peak.margin}% · quote total less materials and labour` : 'No completed jobs with quotes in the last 12 months'}
        headline={data.avgMargin != null ? pct(data.avgMargin) : '—'}
        headlineSub="average margin"
        height={300}
      >
        <TrendChart
          data={data.byMonth.map(m => ({ month: m.month, value: m.margin }))}
          format={pct}
          seriesLabel="avg margin"
          gradientId="margin-month"
        />
      </ChartCard>

      <ChartCard title="Margin by job type" subtitle={`${data.byJobType.length} types · red = under 10%`} height={Math.max(260, 40 + data.byJobType.length * 34)}>
        <HBarChart data={bars} format={pct} seriesLabel="margin" gradientId="margin-type" labelWidth={124} />
      </ChartCard>
    </div>
  )
}
