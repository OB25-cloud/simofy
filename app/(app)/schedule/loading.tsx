export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header + controls */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="h-7 w-28 bg-line rounded animate-pulse mb-2" />
          <div className="h-3.5 w-48 bg-line-soft rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-line rounded-lg animate-pulse" />
          <div className="h-8 w-16 bg-line rounded-lg animate-pulse" />
          <div className="h-8 w-40 bg-line rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-line rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface rounded-xl border border-line shadow-card p-4">
            <div className="h-2.5 w-20 bg-line rounded animate-pulse" />
            <div className="h-7 w-10 bg-line rounded animate-pulse mt-3" />
            <div className="h-2.5 w-24 bg-line-soft rounded animate-pulse mt-2.5" />
          </div>
        ))}
      </div>

      {/* Panel + board */}
      <div className="flex gap-3">
        <div className="hidden md:block w-[272px] shrink-0 bg-surface rounded-xl border border-line shadow-card p-3 space-y-2">
          <div className="h-3 w-24 bg-line rounded animate-pulse mb-3" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-surface-muted animate-pulse" />)}
        </div>
        <div className="flex-1 bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="h-11 bg-surface-muted border-b border-line" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex border-b border-line-soft" style={{ height: 72 }}>
              <div className="w-[208px] shrink-0 flex items-center gap-3 px-4 border-r border-line">
                <div className="w-9 h-9 rounded-full bg-line animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-line animate-pulse" />
                  <div className="h-2.5 w-16 rounded bg-line-soft animate-pulse" />
                </div>
              </div>
              <div className="flex-1 relative">
                {i % 3 !== 2 && <div className="absolute top-2 h-14 rounded-lg bg-surface-muted animate-pulse" style={{ left: `${8 + i * 9}%`, width: '18%' }} />}
                {i % 2 === 0 && <div className="absolute top-2 h-14 rounded-lg bg-surface-muted animate-pulse" style={{ left: `${45 + i * 5}%`, width: '22%' }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
