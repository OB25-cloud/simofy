'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/types'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_CONFIG: Record<PurchaseOrderStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending:   { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending'   },
  approved:  { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Approved'  },
  received:  { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Received' },
  cancelled: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled'},
}

const STATUS_OPTIONS: PurchaseOrderStatus[] = ['pending', 'approved', 'received', 'cancelled']

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

interface Props {
  jobId: string
  purchaseOrders: PurchaseOrder[]
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>
  isAdmin: boolean
}

export default function PurchaseOrdersSection({ jobId, purchaseOrders, setPurchaseOrders, isAdmin }: Props) {
  const [supplier, setSupplier] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [adding, setAdding] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAdd() {
    const trimmedSupplier = supplier.trim()
    const parsedAmount = parseFloat(amount)
    if (!trimmedSupplier || !amount || parsedAmount <= 0) return

    setAdding(true)
    setError('')

    let receiptUrl: string | null = null
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()
      const fileName = `${jobId}/${Date.now()}.${ext}`
      const { error: storageError } = await supabase.storage.from('po-receipts').upload(fileName, receiptFile)
      if (storageError) {
        setError(storageError.message)
        setAdding(false)
        return
      }
      const { data: urlData } = supabase.storage.from('po-receipts').getPublicUrl(fileName)
      receiptUrl = urlData.publicUrl
    }

    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .insert({
        job_id: jobId,
        supplier: trimmedSupplier,
        description: description.trim() || null,
        amount: parsedAmount,
        status: 'pending',
        receipt_url: receiptUrl,
      })
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
    } else {
      setPurchaseOrders(prev => [data, ...prev])
      setSupplier('')
      setDescription('')
      setAmount('')
      setReceiptFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setAdding(false)
  }

  async function handleStatusChange(po: PurchaseOrder, status: PurchaseOrderStatus) {
    setUpdatingId(po.id)
    const { data, error: dbError } = await supabase
      .from('purchase_orders')
      .update({ status })
      .eq('id', po.id)
      .select()
      .single()

    if (!dbError) {
      setPurchaseOrders(prev => prev.map(p => (p.id === po.id ? data : p)))
    }
    setUpdatingId(null)
  }

  const totalAmount = purchaseOrders.reduce((sum, po) => sum + po.amount, 0)
  const receivedAmount = purchaseOrders.filter(po => po.status === 'received').reduce((sum, po) => sum + po.amount, 0)

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-5">
        Purchase Orders
        <span className="ml-2 text-sm font-normal text-gray-400">({purchaseOrders.length})</span>
      </h2>

      {/* Add purchase order form */}
      <div className="rounded-lg border border-gray-100 p-4 mb-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Supplier</label>
            <input
              type="text"
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              placeholder="e.g. Bunnings Warehouse"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#B8922A]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-gray-200 pl-7 pr-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#B8922A]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's being ordered…"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#B8922A]"
          />
        </div>

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Receipt (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={e => setReceiptFile(e.target.files?.[0] ?? null)}
              className="text-xs text-gray-500"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={adding || !supplier.trim() || !amount || parseFloat(amount) <= 0}
            className="flex items-center gap-1.5 px-4 py-3 sm:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#B8922A' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {adding ? 'Adding…' : 'Add Purchase Order'}
          </button>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Purchase orders table */}
      {purchaseOrders.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 py-10 text-center">
          <p className="text-sm text-gray-400">No purchase orders yet</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Supplier</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Description</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Receipt</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchaseOrders.map(po => (
                <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 font-medium">{po.supplier}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                    {po.description
                      ? <span className="block truncate">{po.description}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtCurrency(po.amount)}</td>
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
                  <td className="px-4 py-3">
                    {po.receipt_url ? (
                      <a
                        href={po.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs hover:underline"
                        style={{ color: '#B8922A' }}
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(po.created_at)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100 bg-gray-50">
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Total ({fmtCurrency(receivedAmount)} received)
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtCurrency(totalAmount)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
