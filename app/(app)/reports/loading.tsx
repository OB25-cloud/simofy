export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="h-2.5 w-24 bg-line rounded animate-pulse mb-2" />
          <div className="h-7 w-32 bg-line rounded animate-pulse" />
        </div>
        <div className="h-8 w-56 bg-line rounded-lg animate-pulse" />
      </div>

      {/* Hero strip */}
      <div className="rounded-2xl mb-5 grid grid-cols-2 md:grid-cols-4" style={{ background: '#161b27' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-5 py-4">
            <div className="h-2.5 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-7 w-28 rounded animate-pulse mt-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="h-2.5 w-32 rounded animate-pulse mt-2.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ))}
      </div>

      {/* Tab pills */}
      <div className="mb-5 h-10 w-[420px] bg-line rounded-xl animate-pulse" />

      {/* Chart panels */}
      <div className="rounded-2xl mb-4 h-[360px]" style={{ background: '#161b27' }} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl h-[380px]" style={{ background: '#161b27' }} />
        <div className="rounded-2xl h-[380px]" style={{ background: '#161b27' }} />
      </div>
    </div>
  )
}
