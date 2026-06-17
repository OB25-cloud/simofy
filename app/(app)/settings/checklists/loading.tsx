export default function Loading() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100 shrink-0">
        <div className="h-3 w-14 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-6 w-52 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-3.5 w-80 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* Template list */}
        <div className="w-72 shrink-0 border-r border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="h-9 w-full bg-gray-100 rounded-md animate-pulse" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-3.5 border-b border-gray-50">
              <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse mb-1.5" />
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Items */}
        <div className="flex-1 p-6">
          <div className="h-6 w-40 bg-gray-100 rounded animate-pulse mb-6" />
          <div className="rounded-lg border border-gray-100 overflow-hidden mb-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="px-5 py-3.5 flex items-center justify-between"
                style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
              >
                <div className="h-3.5 w-48 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-10 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-12 w-full bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
