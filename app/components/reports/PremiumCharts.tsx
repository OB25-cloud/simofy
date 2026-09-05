'use client'

import React from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { GREEN, TEAL, GREEN_DEEP, axisTick, axisLine, gridStroke, cursorFill, PANEL, CATEGORICAL } from './chartTheme'

// ─── tooltip ─────────────────────────────────────────────────────────────────

type TooltipPayloadItem = { value?: number | string; name?: string; payload?: Record<string, unknown>; color?: string }
type GlassTooltipProps = {
  active?: boolean
  label?: string | number
  payload?: TooltipPayloadItem[]
  format?: (value: number) => string
  seriesLabel?: string
  labelKey?: string
  swatch?: (item: TooltipPayloadItem) => string | undefined
}

// Dark, rounded tooltip with the green accent — shared by every chart so the
// hover layer feels like one system.
export function GlassTooltip({ active, label, payload, format = v => String(v), seriesLabel, labelKey, swatch }: GlassTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]
  const title = labelKey && item.payload ? String(item.payload[labelKey] ?? label ?? '') : String(label ?? item.name ?? '')
  const color = swatch?.(item) ?? item.color ?? GREEN
  return (
    <div
      className="rounded-xl px-3 py-2.5 min-w-[140px]"
      style={{
        background: 'rgba(15, 20, 31, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 0 0 1px rgba(74,222,128,0.28), 0 14px 32px -8px rgba(0,0,0,0.65)',
      }}
    >
      <p className="text-[11px] font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{title}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <p className="text-[15px] font-bold tabular-nums text-white leading-none">{format(Number(item.value ?? 0))}</p>
        {seriesLabel && <span className="text-[10.5px] ml-auto pl-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{seriesLabel}</span>}
      </div>
    </div>
  )
}

// ─── trend (area) chart ──────────────────────────────────────────────────────

type TrendPoint = { month: string; value: number }
type DotProps = { cx?: number; cy?: number; payload?: TrendPoint; index?: number }

interface TrendChartProps {
  data: TrendPoint[]
  format: (v: number) => string
  axisFormat?: (v: number) => string
  seriesLabel: string
  gradientId: string
  peakLabel?: string
  allowDecimals?: boolean
}

// Smooth green line, gradient fill beneath, peak month called out. The last
// point also gets a subtle glowing dot so "now" is easy to find.
export function TrendChart({ data, format, axisFormat, seriesLabel, gradientId, peakLabel = 'PEAK', allowDecimals = false }: TrendChartProps) {
  const max = data.length > 0 ? Math.max(...data.map(p => p.value)) : 0
  const peakIndex = max > 0 ? data.findIndex(p => p.value === max) : -1
  const lastIndex = data.length - 1

  function renderDot(props: DotProps) {
    const { cx, cy, index } = props
    if (cx == null || cy == null || index == null) return <g key={`d-${index}`} />
    const isPeak = index === peakIndex
    const isLast = index === lastIndex
    if (!isPeak && !isLast) return <g key={`d-${index}`} />
    return (
      <g key={`d-${index}`}>
        {isPeak && (
          <>
            <rect x={cx - 22} y={cy - 32} width={44} height={17} rx={8.5} fill="rgba(74,222,128,0.14)" stroke="rgba(74,222,128,0.4)" />
            <text x={cx} y={cy - 20.5} textAnchor="middle" fontSize={8.5} fontWeight={700} letterSpacing={1} fill={GREEN}>{peakLabel}</text>
          </>
        )}
        <circle cx={cx} cy={cy} r={isPeak ? 9 : 7} fill={GREEN} opacity={0.18} />
        <circle cx={cx} cy={cy} r={isPeak ? 4.5 : 3.5} fill={GREEN} stroke={PANEL} strokeWidth={2} />
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 36, right: 18, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity={0.32} />
            <stop offset="55%" stopColor={GREEN} stopOpacity={0.08} />
            <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GREEN_DEEP} />
            <stop offset="60%" stopColor={GREEN} />
            <stop offset="100%" stopColor={TEAL} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={axisLine} dy={6} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={46} allowDecimals={allowDecimals} tickFormatter={axisFormat ?? format} />
        <Tooltip
          cursor={{ stroke: 'rgba(74,222,128,0.35)', strokeWidth: 1, strokeDasharray: '4 4' }}
          content={<GlassTooltip format={format} seriesLabel={seriesLabel} />}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={`url(#${gradientId}-stroke)`}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={renderDot}
          activeDot={{ r: 5, fill: GREEN, stroke: PANEL, strokeWidth: 2 }}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── horizontal bars ─────────────────────────────────────────────────────────

type HBarDatum = { label: string; value: number; color?: string }

interface HBarProps {
  data: HBarDatum[]
  format: (v: number) => string
  axisFormat?: (v: number) => string
  seriesLabel: string
  gradientId: string
  labelWidth?: number
  /** Single-hue: bars fade by rank. Overridden per-datum by `color`. */
  fade?: boolean
}

export function HBarChart({ data, format, axisFormat, seriesLabel, gradientId, labelWidth = 120, fade = true }: HBarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }} barCategoryGap={8}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GREEN_DEEP} />
            <stop offset="100%" stopColor={GREEN} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 6" horizontal={false} />
        <XAxis type="number" tick={axisTick} tickLine={false} axisLine={axisLine} tickFormatter={axisFormat ?? format} />
        <YAxis type="category" dataKey="label" tick={{ ...axisTick, fill: 'rgba(255,255,255,0.72)' }} tickLine={false} axisLine={false} width={labelWidth} />
        <Tooltip cursor={{ fill: cursorFill }} content={<GlassTooltip format={format} seriesLabel={seriesLabel} labelKey="label" swatch={i => (i.payload?.color as string | undefined)} />} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} background={{ fill: 'rgba(255,255,255,0.035)', radius: 6 }} animationDuration={700}>
          {data.map((d, i) => (
            <Cell
              key={d.label}
              fill={d.color ?? `url(#${gradientId})`}
              fillOpacity={d.color ? 0.9 : fade ? Math.max(0.35, 1 - i * 0.11) : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── vertical bars ───────────────────────────────────────────────────────────

type VBarDatum = { label: string; value: number; color?: string }

interface VBarProps {
  data: VBarDatum[]
  format: (v: number) => string
  axisFormat?: (v: number) => string
  seriesLabel: string
  allowDecimals?: boolean
}

export function VBarChart({ data, format, axisFormat, seriesLabel, allowDecimals = false }: VBarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 18, bottom: 4, left: 4 }} barCategoryGap={22}>
        <defs>
          {data.map((d, i) => (
            <linearGradient key={i} id={`vbar-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={d.color ?? GREEN} stopOpacity={1} />
              <stop offset="100%" stopColor={d.color ?? GREEN} stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={axisLine} dy={6} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} allowDecimals={allowDecimals} tickFormatter={axisFormat ?? format} />
        <Tooltip cursor={{ fill: cursorFill }} content={<GlassTooltip format={format} seriesLabel={seriesLabel} labelKey="label" swatch={i => (i.payload?.color as string | undefined)} />} />
        <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={44} animationDuration={700}>
          {data.map((d, i) => <Cell key={d.label} fill={`url(#vbar-${i})`} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── donut ───────────────────────────────────────────────────────────────────

type DonutDatum = { label: string; value: number }

interface DonutProps {
  data: DonutDatum[]
  format: (v: number) => string
  centreLabel: string
  centreValue: string
}

// Green → teal → slate, in fixed order; anything past the fourth slice is
// folded into "Other" so the palette is never cycled.
export function DonutChart({ data, format, centreLabel, centreValue }: DonutProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const head = sorted.slice(0, CATEGORICAL.length - (sorted.length > CATEGORICAL.length ? 1 : 0))
  const rest = sorted.slice(head.length)
  const slices = rest.length > 0 ? [...head, { label: 'Other', value: rest.reduce((s, d) => s + d.value, 0) }] : head
  const total = slices.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex h-full items-center gap-4 px-3">
      <div className="relative h-full flex-1 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={3}
              cornerRadius={5}
              stroke={PANEL}
              strokeWidth={2}
              animationDuration={800}
            >
              {slices.map((s, i) => <Cell key={s.label} fill={CATEGORICAL[i]} />)}
            </Pie>
            <Tooltip content={<GlassTooltip format={format} labelKey="label" swatch={i => CATEGORICAL[slices.findIndex(s => s.label === i.payload?.label)]} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.4)' }}>{centreLabel}</p>
          <p className="text-[20px] font-bold tabular-nums tracking-tight text-white leading-none mt-1">{centreValue}</p>
        </div>
      </div>
      <ul className="w-[46%] max-w-[210px] space-y-2.5 shrink-0">
        {slices.map((s, i) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
          return (
            <li key={s.label}>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORICAL[i], boxShadow: `0 0 6px ${CATEGORICAL[i]}66` }} />
                  <span className="truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{s.label}</span>
                </span>
                <span className="tabular-nums shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>{pct}%</span>
              </div>
              <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CATEGORICAL[i], opacity: 0.85 }} />
              </div>
              <p className="mt-0.5 text-[10.5px] tabular-nums" style={{ color: 'rgba(255,255,255,0.38)' }}>{format(s.value)}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
