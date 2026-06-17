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
      style={{ background: '#111', boxShadow: '0 0 0 1px rgba(184,146,42,0.15), 0 4px 24px rgba(0,0,0,0.4)' }}
    >
      <div className="flex items-center gap-2.5 px-6 py-4 border-b" style={{ borderColor: 'rgba(184,146,42,0.2)' }}>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: GOLD }}>{title}</span>
        {subtitle && <span className="ml-auto text-[10px]" style={{ color: 'rgba(184,146,42,0.4)' }}>{subtitle}</span>}
      </div>
      <div className="px-4 py-4" style={{ height }}>
        {children}
      </div>
    </div>
  )
}
