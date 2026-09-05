export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-28 bg-line rounded animate-pulse mb-2" />
        <div className="h-4 w-44 bg-line rounded animate-pulse" />
      </div>

      {/* Upcoming group */}
      <div className="mb-6">
        <div className="h-3 w-32 bg-line rounded animate-pulse mb-3" />
        <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-line-soft' : ''}`}
            >
              <div>
                <div className="h-3.5 w-40 bg-line rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-line rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-line rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Past group */}
      <div>
        <div className="h-3 w-14 bg-line rounded animate-pulse mb-3" />
        <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-4 opacity-60 ${i > 0 ? 'border-t border-line-soft' : ''}`}
            >
              <div>
                <div className="h-3.5 w-36 bg-line rounded animate-pulse mb-2" />
                <div className="h-3 w-28 bg-line rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-line rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
