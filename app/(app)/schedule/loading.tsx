export default function Loading() {
  return (
    <div className="h-[calc(100vh-56px-var(--demo-banner-h))] md:h-[calc(100vh-var(--demo-banner-h))] flex flex-col bg-surface">
      {/* Stat bar */}
      <div className="shrink-0 h-11 flex items-center gap-6 px-4 border-b border-line bg-surface-muted/60">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-line animate-pulse" />
            <div className="h-3.5 w-6 rounded bg-line animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-line-soft animate-pulse" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 h-11 flex items-center gap-2 px-3 border-b border-line">
        <div className="h-7 w-14 rounded-md bg-line animate-pulse" />
        <div className="h-7 w-14 rounded-md bg-line animate-pulse" />
        <div className="h-3.5 w-44 rounded bg-line animate-pulse ml-1" />
        <div className="h-7 w-36 rounded-md bg-line animate-pulse ml-1" />
        <div className="h-7 w-20 rounded-md bg-line animate-pulse ml-auto" />
      </div>

      {/* Rail + board */}
      <div className="flex-1 min-h-0 flex">
        <div className="hidden md:block w-10 shrink-0 border-r border-line bg-surface-muted/60" />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="h-10 bg-surface-muted border-b border-line" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex border-b border-line-soft" style={{ height: 96 }}>
              <div className="w-[200px] shrink-0 flex items-center gap-3 px-4 border-r border-line">
                <div className="w-9 h-9 rounded-full bg-line animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-line animate-pulse" />
                  <div className="h-2.5 w-16 rounded bg-line-soft animate-pulse" />
                </div>
              </div>
              <div className="flex-1 relative">
                {i % 3 !== 2 && <div className="absolute top-2 h-[72px] rounded-lg bg-surface-muted animate-pulse" style={{ left: `${8 + i * 9}%`, width: '18%' }} />}
                {i % 2 === 0 && <div className="absolute top-2 h-[72px] rounded-lg bg-surface-muted animate-pulse" style={{ left: `${45 + i * 5}%`, width: '22%' }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
