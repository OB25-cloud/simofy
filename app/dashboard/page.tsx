export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your business</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {['Active Jobs', 'Open Quotes', 'Outstanding Invoices', 'Leads'].map((label) => (
          <div
            key={label}
            className="rounded-lg border border-gray-100 bg-gray-50 p-5"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {label}
            </p>
            <p className="text-2xl font-semibold text-gray-300">—</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-400">Dashboard content coming soon</p>
      </div>
    </div>
  )
}
