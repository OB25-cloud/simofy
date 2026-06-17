'use client'

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import RevenueTrendChart from '@/app/(app)/dashboard/RevenueTrendChart'
import ChartCard from './ChartCard'
import StatCard from './StatCard'
import { axisTick, axisLine, gridStroke, tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle, compactMoneyFormatter, moneyFormatter, PALETTE } from './chartTheme'
import type { RevenueData } from './types'

export default function RevenueTab({ data }: { data: RevenueData }) {
  const topJobType = data.byJobType[0]
  const topLocation = data.byLocation[0]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Revenue" value={moneyFormatter.format(data.total)} sub="last 12 months" accent />
        <StatCard label="Top Job Type" value={topJobType?.jobType ?? '—'} sub={topJobType ? moneyFormatter.format(topJobType.revenue) : undefined} />
        <StatCard label="Top Location" value={topLocation?.location ?? '—'} sub={topLocation ? moneyFormatter.format(topLocation.revenue) : undefined} />
      </div>

      <RevenueTrendChart data={data.byMonth} title="Revenue by Month" periodLabel="last 12 months" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Revenue by Job Type" subtitle={`${data.byJobType.length} types`} height={320}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byJobType} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={axisLine} tickFormatter={(v: number) => compactMoneyFormatter.format(v)} />
              <YAxis type="category" dataKey="jobType" tick={axisTick} tickLine={false} axisLine={false} width={110} />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => [moneyFormatter.format(Number(value)), 'Revenue']}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {data.byJobType.map((entry, i) => (
                  <Cell key={entry.jobType} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Location" subtitle="Queenstown · Wanaka · Cromwell" height={320}>
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byLocation}
                    dataKey="revenue"
                    nameKey="location"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.byLocation.map((entry, i) => (
                      <Cell key={entry.location} fill={PALETTE[i % PALETTE.length]} stroke="#111" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value) => [moneyFormatter.format(Number(value)), 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 shrink-0">
              {data.byLocation.map((entry, i) => (
                <div key={entry.location} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.location}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
