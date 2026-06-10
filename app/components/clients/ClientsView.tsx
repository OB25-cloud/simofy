'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/types'
import AddClientModal from './AddClientModal'

export default function ClientsView({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.business_name?.toLowerCase().includes(q) ?? false) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false)
    )
  })

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90"
          style={{ background: '#B8922A' }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Client
        </button>
      </div>

      <div className="mb-5 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, business, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#B8922A]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 py-16 text-center">
          <p className="text-sm text-gray-400">
            {search
              ? `No clients match "${search}"`
              : 'No clients yet. Add your first client above.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">
                  Business
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">
                  Added
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors group"
                  style={{
                    borderTop: i === 0 ? undefined : '1px solid #f3f4f6',
                  }}
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {client.name}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {client.business_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {client.email ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {client.phone ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {new Date(client.created_at).toLocaleDateString('en-NZ', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={
                        client.is_active
                          ? { background: '#fdf8ee', color: '#B8922A' }
                          : { background: '#f3f4f6', color: '#9ca3af' }
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: client.is_active ? '#B8922A' : '#d1d5db' }}
                      />
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className="text-gray-300 group-hover:text-[#B8922A] transition-colors text-base"
                    >
                      →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <AddClientModal onClose={() => setShowModal(false)} />}
    </>
  )
}
