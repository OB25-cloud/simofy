'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/types'
import { StatusBadge, statusLabel } from '@/app/components/ui/Badge'
import { StatCard } from '@/app/components/ui/StatCard'
import { inputClass } from '@/app/components/ui/input'

const STATUS_OPTIONS: PurchaseOrderStatus[] = ['pending', 'approved', 'received', 'cancelled']

// Same palette as the shared StatusBadge, expressed as classes so the
// admin-only inline <select> below can look like a badge.
const STATUS_SELECT_CLASS: Record<PurchaseOrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
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
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">Purchase Orders</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {purchaseOrders.length} {purchaseOrders.length === 1 ? 'purchase order' : 'purchase orders'} total
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} danger={s.danger} />
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
            className={`pl-9 pr-4 py-2.5 ${inputClass}`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={inputClass}
          style={{ minWidth: 150 }}
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface-muted py-16 text-center">
          <p className="text-sm text-ink-muted">
            {search || statusFilter !== 'all' ? 'No purchase orders match the current filters.' : 'No purchase orders yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-line shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Supplier</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Description</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Job</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Status</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(po => (
                <tr key={po.id} className="border-t border-line-soft hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-ink">{po.supplier}</td>
                  <td className="px-4 py-3 text-sm text-ink-muted max-w-[180px]">
                    {po.description
                      ? <span className="block truncate">{po.description}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[140px]">
                    {po.job_id ? (
                      <Link href={`/jobs/${po.job_id}`} className="block truncate hover:underline" style={{ color: 'var(--accent)' }}>
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
                        className={`text-xs rounded-full px-2.5 py-0.5 font-medium border-0 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 ${STATUS_SELECT_CLASS[po.status]}`}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge status={po.status} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                    {fmt(po.amount)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
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
