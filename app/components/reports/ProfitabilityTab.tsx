'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import ChartCard from './ChartCard'
import StatCard from './StatCard'
import { axisTick, axisLine, gridStroke, tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle, GOLD, PALETTE } from './chartTheme'
import type { ProfitabilityData } from './types'

export default function ProfitabilityTab({ data }: { data: ProfitabilityData }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Avg Margin"
          value={data.avgMargin != null ? `${data.avgMargin}%` : '—'}
          sub="completed jobs, last 12 months"
          accent
          danger={data.avgMargin != null && data.avgMargin < 10}
        />
        <StatCard
          label="Best Job Type"
          value={data.byJobType[0]?.jobType ?? '—'}
          sub={data.byJobType[0] ? `${data.byJobType[0].margin}% margin` : undefined}
        />
        <StatCard
          label="Tightest Job Type"
          value={data.byJobType[data.byJobType.length - 1]?.jobType ?? '—'}
          sub={data.byJobType.length > 0 ? `${data.byJobType[data.byJobType.length - 1].margin}% margin` : undefined}
          danger={data.byJobType.length > 0 && data.byJobType[data.byJobType.length - 1].margin < 10}
        />
      </div>

      <ChartCard title="Margin Trend" subtitle="last 12 months">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.byMonth} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={axisLine} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} width={40} />
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              formatter={(value) => [`${value}%`, 'Margin']}
            />
            <Line
              type="monotone"
              dataKey="margin"
              stroke={GOLD}
              strokeWidth={2.5}
              dot={{ fill: GOLD, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: GOLD, stroke: '#1a1a1a', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Margin by Job Type" subtitle={`${data.byJobType.length} types`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.byJobType} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="jobType" tick={axisTick} tickLine={false} axisLine={axisLine} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} width={40} />
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              formatter={(value) => [`${value}%`, 'Margin']}
            />
            <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
              {data.byJobType.map((entry, i) => (
                <Cell key={entry.jobType} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
