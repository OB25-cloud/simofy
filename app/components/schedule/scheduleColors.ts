import type { CSSProperties } from 'react'

export const UNASSIGNED_KEY = 'unassigned'

export type StaffColor = { rgb: string; solid: string }

// 8 distinct hues, consistent per staff member regardless of list order/composition.
const STAFF_COLORS: StaffColor[] = [
  { rgb: '201,168,76', solid: '#C9A84C' }, // gold
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
