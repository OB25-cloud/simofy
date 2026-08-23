export const GOLD = '#C9A84C'

export const moneyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', maximumFractionDigits: 0,
})
export const compactMoneyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', notation: 'compact', maximumFractionDigits: 1,
})

export const axisTick = { fill: 'rgba(255,255,255,0.5)', fontSize: 11 }
export const axisLine = { stroke: 'rgba(201, 168, 76,0.2)' }
export const gridStroke = '#2a2a2a'

export const tooltipContentStyle = {
  background: '#1A1A2E',
  border: '1px solid rgba(201, 168, 76,0.3)',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}
export const tooltipLabelStyle = { color: '#fff', fontWeight: 600, marginBottom: 2 }
export const tooltipItemStyle = { color: GOLD, fontWeight: 600 }

// Used for charts with multiple series/categories (bar colours, pie slices)
export const PALETTE = ['#C9A84C', '#3b82f6', '#22c55e', '#8b5cf6', '#f97316', '#ef4444', '#06b6d4', '#eab308']
