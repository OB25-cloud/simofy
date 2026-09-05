export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-24 bg-line rounded animate-pulse mb-2" />
          <div className="h-3.5 w-48 bg-line-soft rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-line rounded-lg animate-pulse" />
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={['h-[116px] bg-surface rounded-xl border border-line shadow-card pl-4 pr-3 py-3 flex flex-col', i === 0 ? 'col-span-2 md:col-span-1' : ''].join(' ')}>
            <div className="h-2.5 w-20 bg-line rounded animate-pulse" />
            <div className="h-7 w-14 bg-line rounded animate-pulse mt-auto" />
            <div className="h-2.5 w-28 bg-line-soft rounded animate-pulse mt-2.5" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-3 bg-surface rounded-xl border border-line shadow-card px-3 py-2.5 flex items-center gap-3">
        <div className="h-7 w-80 bg-line-soft rounded-lg animate-pulse" />
        <div className="h-8 w-64 bg-line rounded-lg animate-pulse ml-auto" />
      </div>
      <div className="mb-4 h-3 w-80 bg-line-soft rounded animate-pulse" />

      {/* Table */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="h-9 bg-surface-muted border-b border-line" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-line-soft">
            <div className="w-1.5 h-9 rounded-full bg-line animate-pulse" />
            <div className="h-6 w-24 bg-line rounded-md animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 bg-line rounded animate-pulse" />
              <div className="h-2.5 w-32 bg-line-soft rounded animate-pulse" />
            </div>
            <div className="h-5 w-20 bg-line rounded-full animate-pulse" />
            <div className="h-3 w-20 bg-line-soft rounded animate-pulse" />
            <div className="h-3.5 w-20 bg-line rounded animate-pulse" />
            <div className="h-6 w-24 bg-line-soft rounded animate-pulse" />
            <div className="h-6 w-24 bg-line-soft rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
