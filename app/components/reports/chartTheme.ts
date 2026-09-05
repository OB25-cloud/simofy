// Chart colours for the dark report panels. Recharts writes these straight into
// SVG attributes, so they stay as hex rather than CSS vars — keep in sync with
// --accent-bright / --charcoal in app/globals.css.
export const GOLD = '#4ade80' // legacy name: the brand accent as rendered on dark surfaces
export const ACCENT_ON_DARK = GOLD

export const moneyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', maximumFractionDigits: 0,
})
export const compactMoneyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', notation: 'compact', maximumFractionDigits: 1,
})

export const axisTick = { fill: 'rgba(255,255,255,0.5)', fontSize: 11 }
export const axisLine = { stroke: 'rgba(255,255,255,0.12)' }
export const gridStroke = 'rgba(255,255,255,0.07)'

export const tooltipContentStyle = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
}
export const tooltipLabelStyle = { color: '#fff', fontWeight: 600, marginBottom: 2 }
export const tooltipItemStyle = { color: GOLD, fontWeight: 600 }

// Used for charts with multiple series/categories (bar colours, pie slices)
export const PALETTE = ['#4ade80', '#60a5fa', '#a78bfa', '#fb923c', '#f87171', '#22d3ee', '#facc15', '#f472b6']
