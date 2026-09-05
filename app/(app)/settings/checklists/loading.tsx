export default function Loading() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-line shrink-0">
        <div className="h-3 w-14 bg-line rounded animate-pulse mb-2" />
        <div className="h-6 w-52 bg-line rounded animate-pulse mb-2" />
        <div className="h-3.5 w-80 bg-line rounded animate-pulse" />
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* Template list */}
        <div className="w-72 shrink-0 border-r border-line">
          <div className="px-4 py-3 border-b border-line">
            <div className="h-9 w-full bg-line rounded-md animate-pulse" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-3.5 border-b border-line-soft">
              <div className="h-3.5 w-32 bg-line rounded animate-pulse mb-1.5" />
              <div className="h-3 w-16 bg-line rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Items */}
        <div className="flex-1 p-6">
          <div className="h-6 w-40 bg-line rounded animate-pulse mb-6" />
          <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden mb-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`px-5 py-3.5 flex items-center justify-between ${i > 0 ? 'border-t border-line-soft' : ''}`}
              >
                <div className="h-3.5 w-48 bg-line rounded animate-pulse" />
                <div className="h-3 w-10 bg-line rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-12 w-full bg-line rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
