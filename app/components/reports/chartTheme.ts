// Chart colours for the dark report panels. Recharts writes these straight into
// SVG attributes, so they stay as hex/rgba rather than CSS vars — keep in sync
// with --accent / --accent-bright / --charcoal in app/globals.css.

/** Brand green as rendered on dark surfaces (= --accent-bright). */
export const GREEN = '#4ade80'
/** Legacy export name — some callers still import GOLD. */
export const GOLD = GREEN
export const ACCENT_ON_DARK = GREEN
export const GREEN_DEEP = '#15803d'
export const TEAL = '#2dd4bf'
export const SLATE = '#94a3b8'
export const SLATE_DEEP = '#64748b'

/** Chart panel surface (deep charcoal with a hint of blue). */
export const PANEL = '#161b27'
export const PANEL_TOP = '#1b2131'

// Considered categorical order for the few multi-series charts (donut):
// green → teal → slate → deep slate. Never cycled past four; anything
// further folds into "Other". Identity is always doubled with labels.
export const CATEGORICAL = [GREEN, TEAL, SLATE, SLATE_DEEP]

// Refined status colours for the dark panel — the app's status hues, taken
// down from neon so they sit with the green.
export const STATUS_ON_DARK: Record<string, string> = {
  complete: '#4ade80',
  invoiced: '#2dd4bf',
  scheduled: '#60a5fa',
  in_progress: '#fbbf24',
  pending: '#94a3b8',
  cancelled: '#f87171',
}

export const moneyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', maximumFractionDigits: 0,
})
export const compactMoneyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', notation: 'compact', maximumFractionDigits: 1,
})

export const axisTick = { fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 500 }
export const axisLine = { stroke: 'rgba(255,255,255,0.08)' }
export const gridStroke = 'rgba(255,255,255,0.06)'
export const cursorFill = 'rgba(255,255,255,0.035)'

// Kept for any caller still using Recharts' default tooltip chrome.
export const tooltipContentStyle = {
  background: 'rgba(17, 24, 39, 0.94)',
  border: '1px solid rgba(74,222,128,0.25)',
  borderRadius: 10,
  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
}
export const tooltipLabelStyle = { color: '#fff', fontWeight: 600, marginBottom: 2 }
export const tooltipItemStyle = { color: GREEN, fontWeight: 600 }

/** @deprecated rainbow palette — kept only so nothing imports break; unused. */
export const PALETTE = CATEGORICAL
