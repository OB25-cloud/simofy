export default function InvoicesPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">Track billing and payments</p>
        </div>
        <button
          className="px-4 py-2 text-sm font-medium text-white rounded-md"
          style={{ background: '#B8922A' }}
        >
          New Invoice
        </button>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-400">Invoices list coming soon</p>
      </div>
    </div>
  )
}
