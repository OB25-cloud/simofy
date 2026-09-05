import type { CSSProperties } from 'react'

export const UNASSIGNED_KEY = 'unassigned'

export type StaffColor = { rgb: string; solid: string }

// 8 distinct hues, consistent per staff member regardless of list order/composition.
// Used for staff avatars (column headers, week-view job card avatars) — job
// blocks themselves are colour-coded by status, not by staff, see below.
const STAFF_COLORS: StaffColor[] = [
  { rgb: '245,158,11', solid: '#f59e0b' }, // amber
  { rgb: '59,130,246', solid: '#3b82f6' }, // blue
  { rgb: '20,184,166', solid: '#14b8a6' }, // teal
  { rgb: '139,92,246', solid: '#8b5cf6' }, // purple
  { rgb: '249,115,22', solid: '#f97316' }, // orange
  { rgb: '100,116,139', solid: '#64748b' }, // slate
  { rgb: '99,102,241', solid: '#6366f1' }, // indigo
  { rgb: '236,72,153', solid: '#ec4899' }, // pink
]
const UNASSIGNED_COLOR: StaffColor = { rgb: '148,163,184', solid: '#94a3b8' }

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash
}

export function colorForStaff(staffId: string | null): StaffColor {
  if (!staffId) return UNASSIGNED_COLOR
  return STAFF_COLORS[hashId(staffId) % STAFF_COLORS.length]
}

// ─── status colours ─────────────────────────────────────────────────────────
// Single source of truth for job-block colour coding across Day/Week/Map —
// matches the badge system used everywhere else in the app.

const STATUS_COLORS: Record<string, StaffColor> = {
  scheduled:   { solid: '#3B82F6', rgb: '59,130,246' },
  in_progress: { solid: '#F59E0B', rgb: '245,158,11' },
  complete:    { solid: '#22C55E', rgb: '34,197,94' },
  invoiced:    { solid: '#22C55E', rgb: '34,197,94' }, // treated as "done", same as complete
  cancelled:   { solid: '#EF4444', rgb: '239,68,68' },
  pending:     { solid: 'var(--ink-muted)', rgb: '107,114,128' },
}
const DEFAULT_STATUS_COLOR: StaffColor = STATUS_COLORS.pending

export function colorForStatus(status: string | null | undefined): StaffColor {
  if (!status) return DEFAULT_STATUS_COLOR
  return STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  complete: 'Complete',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
}

// Frosted-glass card styling shared by the Day and Week job blocks.
export function glassCardStyle(rgb: string): CSSProperties {
  return {
    background: `rgba(${rgb}, 0.22)`,
    border: `1px solid rgba(${rgb}, 0.55)`,
    boxShadow: `0 0 14px rgba(${rgb}, 0.28), inset 0 1px 1px rgba(255,255,255,0.1)`,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  }
}
