'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/types'

const STATUS_CONFIG: Record<PurchaseOrderStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending:   { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending'    },
  approved:  { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Approved'   },
  received:  { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Received'  },
  cancelled: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled' },
}

const STATUS_OPTIONS: PurchaseOrderStatus[] = ['pending', 'approved', 'received', 'cancelled']

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

function fmtShort(n: number) {
  if (n >= 100_000) return `$${(n / 1000).toFixed(0)}k`
  if (n >= 10_000)  return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function SearchIcon() {
  return (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

interface Props {
  purchaseOrders: PurchaseOrder[]
  isAdmin: boolean
}

export default function PurchaseOrdersListView({ purchaseOrders: initialPurchaseOrders, isAdmin }: Props) {
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const totalValue = purchaseOrders.reduce((sum, po) => sum + po.amount, 0)
  const pendingValue = purchaseOrders.filter(po => po.status === 'pending').reduce((sum, po) => sum + po.amount, 0)
  const receivedValue = purchaseOrders.filter(po => po.status === 'received').reduce((sum, po) => sum + po.amount, 0)

  const stats = [
    { label: 'Total Purchase Orders', value: String(purchaseOrders.length), accent: true  },
    { label: 'Total Value',           value: fmtShort(totalValue),          accent: true  },
    { label: 'Pending Value',         value: fmtShort(pendingValue),        danger: false },
    { label: 'Received Value',        value: fmtShort(receivedValue),       accent: false },
  ]

  const filtered = purchaseOrders.filter(po => {
    const s = search.toLowerCase()
    const matchSearch =
      po.supplier.toLowerCase().includes(s) ||
      (po.description?.toLowerCase().includes(s) ?? false) ||
      (po.jobs?.title?.toLowerCase().includes(s) ?? false) ||
      (po.status?.includes(s) ?? false)
    const matchStatus = statusFilter === 'all' || po.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleStatusChange(po: PurchaseOrder, status: PurchaseOrderStatus) {
    setUpdatingId(po.id)
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ status })
      .eq('id', po.id)
      .select('*, jobs(title, job_type)')
      .single()

    if (!error) {
      setPurchaseOrders(prev => prev.map(p => (p.id === po.id ? data : p)))
    }
    setUpdatingId(null)
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {purchaseOrders.length} {purchaseOrders.length === 1 ? 'purchase order' : 'purchase orders'} total
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: s.danger ? '#dc2626' : s.accent ? '#B8922A' : '#111827' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by supplier, description, job or status…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 sm:py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#B8922A]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-3 sm:py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#B8922A] text-gray-600"
          style={{ minWidth: 150 }}
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 py-16 text-center">
          <p className="text-sm text-gray-400">
            {search || statusFilter !== 'all' ? 'No purchase orders match the current filters.' : 'No purchase orders yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Job</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((po, i) => (
                <tr key={po.id} style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}>
                  <td className="px-4 py-3 font-medium text-gray-900">{po.supplier}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px]">
                    {po.description
                      ? <span className="block truncate">{po.description}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[140px]">
                    {po.job_id ? (
                      <Link href={`/jobs/${po.job_id}`} className="block truncate hover:underline" style={{ color: '#B8922A' }}>
                        {po.jobs?.title ?? po.jobs?.job_type ?? 'View job'}
                      </Link>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        value={po.status}
                        onChange={e => handleStatusChange(po, e.target.value as PurchaseOrderStatus)}
                        disabled={updatingId === po.id}
                        className="text-xs rounded-full px-2.5 py-0.5 font-medium border-0 focus:outline-none focus:ring-1 disabled:opacity-50"
                        style={{ background: STATUS_CONFIG[po.status].bg, color: STATUS_CONFIG[po.status].text }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge status={po.status} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">
                    {fmt(po.amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(po.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
