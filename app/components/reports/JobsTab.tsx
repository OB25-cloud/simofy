'use client'

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import ChartCard from './ChartCard'
import StatCard from './StatCard'
import { axisTick, axisLine, gridStroke, tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle, GOLD } from './chartTheme'
import type { JobsStatsData } from './types'

const STATUS_COLOR: Record<string, string> = {
  pending: '#9ca3af',
  scheduled: '#3b82f6',
  in_progress: '#B8922A',
  complete: '#22c55e',
  invoiced: '#8b5cf6',
  cancelled: '#ef4444',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  complete: 'Complete',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
}

export default function JobsTab({ data }: { data: JobsStatsData }) {
  const statusData = data.byStatus.map(s => ({ ...s, label: STATUS_LABEL[s.status] ?? s.status }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={String(data.total)} sub="last 12 months" accent />
        <StatCard label="Completed" value={String(data.completed)} />
        <StatCard label="Completion Rate" value={`${data.completionRate}%`} accent />
        <StatCard label="Avg / Week" value={String(data.avgPerWeek)} />
      </div>

      <ChartCard title="Jobs Completed by Month" subtitle="last 12 months">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.completedByMonth} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={axisLine} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              formatter={(value) => [String(value), 'Completed']}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={GOLD}
              strokeWidth={2.5}
              dot={{ fill: GOLD, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: GOLD, stroke: '#1a1a1a', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Jobs by Status" subtitle={`${data.total} total`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={axisLine} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              formatter={(value) => [String(value), 'Jobs']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {statusData.map(entry => (
                <Cell key={entry.status} fill={STATUS_COLOR[entry.status] ?? '#9ca3af'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
