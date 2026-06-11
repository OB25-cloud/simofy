export default function Loading() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-24 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse mb-5" />
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-100" />
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-gray-50 px-5 flex items-center gap-6"
          >
            <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-28 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-40 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
