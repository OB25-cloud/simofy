export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-24 bg-line rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-line rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-line rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-line rounded-lg animate-pulse mb-5" />
      <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
        <div className="h-10 bg-surface-muted border-b border-line" />
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-line-soft px-5 flex items-center gap-6"
          >
            <div className="h-3.5 w-32 bg-line rounded animate-pulse" />
            <div className="h-3.5 w-28 bg-line rounded animate-pulse" />
            <div className="h-3.5 w-40 bg-line rounded animate-pulse" />
            <div className="h-3.5 w-24 bg-line rounded animate-pulse" />
            <div className="h-3.5 w-20 bg-line rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
