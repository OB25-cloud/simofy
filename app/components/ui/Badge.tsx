import React from 'react'

type BadgeColor = 'green' | 'amber' | 'blue' | 'red' | 'gray'

// Pill badges: soft tinted fill, darker text, hairline inset ring for contrast
// on both white cards and the off-white page canvas.
const COLOR_CLASSES: Record<BadgeColor, string> = {
  green: 'bg-green-50 text-green-800 ring-green-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  blue: 'bg-blue-50 text-blue-800 ring-blue-600/20',
  red: 'bg-red-50 text-red-800 ring-red-600/20',
  gray: 'bg-stone-100 text-stone-600 ring-stone-500/20',
}

const BASE_CLASSES =
  'inline-flex items-center gap-1.5 text-[11px] font-semibold leading-4 px-2.5 py-0.5 rounded-full ring-1 ring-inset whitespace-nowrap'

// Every status string this app can render, mapped to the shared badge palette.
// Unrecognised statuses fall back to gray rather than throwing.
const STATUS_COLOR: Record<string, BadgeColor> = {
  // success / active / done
  paid: 'green',
  active: 'green',
  complete: 'green',
  completed: 'green',
  invoiced: 'green',
  approved: 'green',
  received: 'green',
  accepted: 'green',
  converted: 'green',
  // in-progress / awaiting action
  pending: 'amber',
  draft: 'amber',
  in_progress: 'amber',
  new: 'amber',
  qualified: 'amber',
  // sent / scheduled / mid-flow
  sent: 'blue',
  scheduled: 'blue',
  contacted: 'blue',
  queued: 'blue',
  // negative / needs attention
  overdue: 'red',
  cancelled: 'red',
  declined: 'red',
  expired: 'red',
  lost: 'red',
  unrecovered: 'red',
  failed: 'red',
  // closed out / dormant
  closed: 'gray',
  inactive: 'gray',
  defleeted: 'gray',
  archived: 'gray',
}

export function statusColor(status: string | null | undefined): BadgeColor {
  if (!status) return 'gray'
  return STATUS_COLOR[status.toLowerCase()] ?? 'gray'
}

const DOT_HEX: Record<BadgeColor, string> = {
  green: '#16a34a',
  amber: '#F59E0B',
  blue: '#3B82F6',
  red: '#EF4444',
  gray: '#9CA3AF',
}

// Solid dot colour matching a status's badge category — for status pips,
// timeline markers, board-view accent bars, etc.
export function statusDot(status: string | null | undefined): string {
  return DOT_HEX[statusColor(status)]
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return status
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export interface StatusBadgeProps {
  status: string | null | undefined
  label?: string
  className?: string
}

// Auto-colored badge driven by a status string (job/quote/invoice/PO/lead status, etc).
export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const color = statusColor(status)
  return (
    <span className={[BASE_CLASSES, COLOR_CLASSES[color], className].join(' ')}>
      <span aria-hidden className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: DOT_HEX[color] }} />
      {label ?? statusLabel(status)}
    </span>
  )
}

export interface BadgeProps {
  color: BadgeColor
  children: React.ReactNode
  className?: string
}

// Explicit-color badge for cases with no natural "status" string (e.g. counts, tags).
export default function Badge({ color, children, className = '' }: BadgeProps) {
  return (
    <span className={[BASE_CLASSES, COLOR_CLASSES[color], className].join(' ')}>
      {children}
    </span>
  )
}
