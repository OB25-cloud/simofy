import { PANEL, PANEL_TOP } from './chartTheme'

interface Props {
  title: string
  subtitle?: string
  /** Optional headline figure rendered top-right (e.g. a total). */
  headline?: string
  headlineSub?: string
  height?: number
  className?: string
  children: React.ReactNode
}

// Dark glass chart panel: deep charcoal gradient, hairline border, soft
// green glow bleeding in from the top-left, and a faint inner highlight so
// it reads as a surface rather than a flat rectangle.
export default function ChartCard({ title, subtitle, headline, headlineSub, height = 300, className = '', children }: Props) {
  return (
    <div
      className={['relative rounded-2xl overflow-hidden text-white', className].join(' ')}
      style={{
        background: `linear-gradient(180deg, ${PANEL_TOP} 0%, ${PANEL} 100%)`,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 40px -20px rgba(2,6,23,0.7), 0 4px 12px -6px rgba(2,6,23,0.5)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 w-[420px] h-[260px] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(74,222,128,0.16), rgba(74,222,128,0) 70%)', filter: 'blur(8px)' }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, rgba(74,222,128,0) 0%, rgba(74,222,128,0.45) 35%, rgba(74,222,128,0) 80%)' }} />

      <div className="relative flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-tight">{title}</p>
          {subtitle && <p className="text-[11px] mt-0.5 leading-tight" style={{ color: 'rgba(255,255,255,0.42)' }}>{subtitle}</p>}
        </div>
        {headline && (
          <div className="text-right shrink-0">
            <p className="text-[20px] font-bold tracking-tight tabular-nums leading-none" style={{ color: '#4ade80' }}>{headline}</p>
            {headlineSub && <p className="text-[10.5px] mt-1 leading-none" style={{ color: 'rgba(255,255,255,0.4)' }}>{headlineSub}</p>}
          </div>
        )}
      </div>
      <div className="relative px-2 pb-3" style={{ height }}>
        {children}
      </div>
    </div>
  )
}
