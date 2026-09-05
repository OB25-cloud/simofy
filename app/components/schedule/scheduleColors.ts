export const UNASSIGNED_KEY = 'unassigned'

export type StaffColor = { rgb: string; solid: string }

// 8 distinct hues, consistent per staff member regardless of list order/composition.
// Used for staff avatars (schedule row headers, dashboard crew list) — job
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

export function colorForStaff(staffId: string | null | undefined): StaffColor {
  if (!staffId) return UNASSIGNED_COLOR
  return STAFF_COLORS[hashId(staffId) % STAFF_COLORS.length]
}

// ─── status colours ─────────────────────────────────────────────────────────
// Single source of truth for job-block colour coding across Day/Week/Map.
// Scheduler palette: Scheduled = blue, In Progress = green, Pending = amber,
// Completed/Invoiced = grey, Cancelled = red. `text` is the darker shade used
// for legible text on the light tint; `solid` is the bar/dot colour.

export type StatusColor = StaffColor & { text: string; tint: string; tintStrong: string }

function make(solid: string, rgb: string, text: string): StatusColor {
  return { solid, rgb, text, tint: `rgba(${rgb}, 0.10)`, tintStrong: `rgba(${rgb}, 0.18)` }
}

const STATUS_COLORS: Record<string, StatusColor> = {
  scheduled:   make('#3b82f6', '59,130,246', '#1d4ed8'),
  in_progress: make('#16a34a', '22,163,74', '#15803d'),
  pending:     make('#f59e0b', '245,158,11', '#b45309'),
  complete:    make('#9ca3af', '107,114,128', '#4b5563'),
  invoiced:    make('#9ca3af', '107,114,128', '#4b5563'),
  cancelled:   make('#ef4444', '239,68,68', '#b91c1c'),
}
const DEFAULT_STATUS_COLOR = STATUS_COLORS.pending

export function colorForStatus(status: string | null | undefined): StatusColor {
  if (!status) return DEFAULT_STATUS_COLOR
  return STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  complete: 'Completed',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
}

export function statusLabelFor(status: string | null | undefined): string {
  return STATUS_LABELS[status ?? ''] ?? 'Pending'
}

// Order used by the legend and by the quick status switcher.
export const STATUS_ORDER = ['scheduled', 'in_progress', 'pending', 'complete', 'invoiced', 'cancelled'] as const
