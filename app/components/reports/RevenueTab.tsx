'use client'

import ChartCard from './ChartCard'
import { TrendChart, HBarChart, DonutChart } from './PremiumCharts'
import { moneyFormatter, compactMoneyFormatter } from './chartTheme'
import type { RevenueData } from './types'

const money = (v: number) => moneyFormatter.format(v)
const compact = (v: number) => compactMoneyFormatter.format(v)

export default function RevenueTab({ data }: { data: RevenueData }) {
  const peak = data.byMonth.reduce((best, m) => (m.revenue > best.revenue ? m : best), data.byMonth[0] ?? { month: '—', revenue: 0 })
  const last = data.byMonth[data.byMonth.length - 1]
  const prev = data.byMonth[data.byMonth.length - 2]
  const delta = last && prev && prev.revenue > 0 ? Math.round(((last.revenue - prev.revenue) / prev.revenue) * 100) : null

  return (
    <div className="space-y-4">
      <ChartCard
        title="Revenue by month"
        subtitle={peak.revenue > 0 ? `Peak ${peak.month} · ${money(peak.revenue)}${delta != null ? ` · ${delta >= 0 ? '+' : ''}${delta}% vs last month` : ''}` : 'No paid invoices in the last 12 months'}
        headline={money(data.total)}
        headlineSub="paid, trailing 12 months"
        height={300}
      >
        <TrendChart
          data={data.byMonth.map(m => ({ month: m.month, value: m.revenue }))}
          format={money}
          axisFormat={compact}
          seriesLabel="paid revenue"
          gradientId="rev-month"
        />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue by job type" subtitle={`${data.byJobType.length} types · ranked by paid revenue`} height={320}>
          <HBarChart
            data={data.byJobType.map(d => ({ label: d.jobType, value: d.revenue }))}
            format={money}
            axisFormat={compact}
            seriesLabel="revenue"
            gradientId="rev-type"
            labelWidth={124}
          />
        </ChartCard>

        <ChartCard title="Revenue by location" subtitle="Share of paid revenue by town" height={320}>
          <DonutChart
            data={data.byLocation.map(d => ({ label: d.location, value: d.revenue }))}
            format={money}
            centreLabel="Total"
            centreValue={compact(data.total)}
          />
        </ChartCard>
      </div>
    </div>
  )
}
