import { GOLD } from './chartTheme'

interface Props {
  title: string
  subtitle?: string
  height?: number
  children: React.ReactNode
}

export default function ChartCard({ title, subtitle, height = 280, children }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--charcoal)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px -4px rgba(17,24,39,0.35)' }}
    >
      <div className="flex items-center gap-2.5 px-6 py-4 border-b" style={{ borderColor: 'rgba(74, 222, 128,0.2)' }}>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>{title}</span>
        {subtitle && <span className="ml-auto text-[10px]" style={{ color: 'rgba(74, 222, 128,0.4)' }}>{subtitle}</span>}
      </div>
      <div className="px-4 py-4" style={{ height }}>
        {children}
      </div>
    </div>
  )
}
