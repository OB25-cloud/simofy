import Link from 'next/link'

export type FunnelStage = {
  label: string
  value: number
  href: string
  hint: string
}

// Chevron-shaped stages in deepening greens so the strip reads as a funnel
// rather than a row of cards. Numbers stay big; the shape carries the flow.
const STAGE_STYLES = [
  { bg: 'var(--accent-soft)', fg: 'var(--accent-strong)', sub: 'rgba(20, 83, 45, 0.7)' },
  { bg: '#cfeadb', fg: 'var(--accent-strong)', sub: 'rgba(20, 83, 45, 0.7)' },
  { bg: '#4aa76b', fg: '#ffffff', sub: 'rgba(255,255,255,0.78)' },
  { bg: 'var(--accent)', fg: '#ffffff', sub: 'rgba(255,255,255,0.78)' },
]

export default function PipelineFunnel({ stages }: { stages: FunnelStage[] }) {
  const last = stages.length - 1
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
      {stages.map((stage, i) => {
        const style = STAGE_STYLES[Math.min(i, STAGE_STYLES.length - 1)]
        const first = i === 0
        const isLast = i === last
        // Chevron: notched on the left (except first), pointed on the right (except last).
        const clip = `polygon(0 0, ${isLast ? '100%' : 'calc(100% - 16px)'} 0, 100% 50%, ${isLast ? '100%' : 'calc(100% - 16px)'} 100%, 0 100%, ${first ? '0' : '16px'} 50%)`
        return (
          <Link
            key={stage.label}
            href={stage.href}
            className="group relative flex-1 min-w-0 sm:-ml-2 first:ml-0 transition-[filter] hover:brightness-[1.04]"
            style={{ zIndex: last - i }}
          >
            <div
              className="h-[88px] flex flex-col justify-center"
              style={{
                background: style.bg,
                clipPath: clip,
                paddingLeft: first ? 20 : 32,
                paddingRight: isLast ? 20 : 28,
              }}
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] truncate" style={{ color: style.sub }}>
                {stage.label}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[28px] leading-none font-bold tracking-tight tabular-nums" style={{ color: style.fg }}>
                  {stage.value}
                </span>
                <span className="text-[11px] font-medium truncate" style={{ color: style.sub }}>{stage.hint}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
