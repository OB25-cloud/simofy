export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="h-4 w-28 bg-gray-100 rounded animate-pulse mb-6" />
      <div className="h-7 w-52 bg-gray-100 rounded animate-pulse mb-1" />
      <div className="h-4 w-36 bg-gray-100 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="rounded-lg border border-gray-100 p-5 space-y-4">
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-12 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 p-5 space-y-4">
          <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-4/5 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="h-5 w-24 bg-gray-100 rounded animate-pulse mb-4" />
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-100" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-12 border-b border-gray-50 px-5 flex items-center gap-6"
          >
            <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-24 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
