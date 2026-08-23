export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <div className="h-3 w-14 bg-[#E5E7EB] rounded animate-pulse mb-2" />
        <div className="h-6 w-56 bg-[#E5E7EB] rounded animate-pulse mb-2" />
        <div className="h-3.5 w-full bg-[#E5E7EB] rounded animate-pulse mb-1.5" />
        <div className="h-3.5 w-2/3 bg-[#E5E7EB] rounded animate-pulse" />
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-[#F4F5F7]' : ''}`}
          >
            <div className="flex-1 pr-6">
              <div className="h-3.5 w-40 bg-[#E5E7EB] rounded animate-pulse mb-1.5" />
              <div className="h-3 w-56 bg-[#E5E7EB] rounded animate-pulse" />
            </div>
            <div className="h-6 w-11 bg-[#E5E7EB] rounded-full animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
