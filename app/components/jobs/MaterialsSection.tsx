'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Material, JobMaterial } from '@/lib/types'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

interface Props {
  jobId: string
  materials: Material[]
  initialJobMaterials: JobMaterial[]
}

export default function MaterialsSection({ jobId, materials, initialJobMaterials }: Props) {
  const [jobMaterials, setJobMaterials] = useState<JobMaterial[]>(initialJobMaterials)
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const selectedMaterial = materials.find(m => m.id === selectedId)
  const lineTotal = selectedMaterial ? selectedMaterial.unit_cost * parseFloat(quantity || '0') : 0

  async function handleAdd() {
    if (!selectedId || !quantity || parseFloat(quantity) <= 0) return
    setAdding(true)
    setError('')

    const payload = {
      job_id: jobId,
      material_id: selectedId,
      quantity: parseFloat(quantity),
      unit_cost: selectedMaterial!.unit_cost,
    }
    console.log('[MaterialsSection] insert payload:', payload)

    const { data, error: dbError } = await supabase
      .from('job_materials')
      .insert(payload)
      .select('*, materials(name, unit)')
      .single()

    console.log('[MaterialsSection] insert result — data:', data, '| error:', dbError)

    if (dbError) {
      setError(dbError.message)
    } else {
      setJobMaterials(prev => [...prev, data])
      setSelectedId('')
      setQuantity('1')
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remove this material? This cannot be undone.')) return
    setDeletingId(id)
    const { error: dbError } = await supabase.from('job_materials').delete().eq('id', id)
    if (!dbError) {
      setJobMaterials(prev => prev.filter(m => m.id !== id))
    }
    setDeletingId(null)
  }

  const totalCost = jobMaterials.reduce((sum, m) => sum + m.quantity * m.unit_cost, 0)

  return (
    <div>
      <h2 className="text-base font-semibold text-[#1A1A2E] mb-5">
        Materials Used
        <span className="ml-2 text-sm font-normal text-[#6B7280]">({jobMaterials.length})</span>
      </h2>

      {/* Add material row */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 mb-5">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-[#6B7280] mb-1">Material</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1"
              style={{ '--tw-ring-color': '#C9A84C' } as React.CSSProperties}
            >
              <option value="">Select material…</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} — {fmtCurrency(m.unit_cost)}/{m.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="w-28">
            <label className="block text-xs text-[#6B7280] mb-1">
              Quantity{selectedMaterial ? ` (${selectedMaterial.unit})` : ''}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1"
            />
          </div>

          <div className="w-24">
            <label className="block text-xs text-[#6B7280] mb-1">Line Total</label>
            <p className="py-2 text-sm font-medium text-[#1A1A2E]">
              {selectedMaterial ? fmtCurrency(lineTotal) : '—'}
            </p>
          </div>

          <button
            onClick={handleAdd}
            disabled={adding || !selectedId || parseFloat(quantity || '0') <= 0}
            className="flex items-center gap-1.5 px-4 py-3 sm:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#C9A84C' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>

        {error && <p className="text-xs text-[#EF4444] mt-2">{error}</p>}
      </div>

      {/* Materials table */}
      {jobMaterials.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-10 text-center">
          <p className="text-sm text-[#6B7280]">No materials recorded yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F4F5F7]">
                <th className="text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Material</th>
                <th className="text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Qty</th>
                <th className="text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Unit Cost</th>
                <th className="text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider px-4 py-3">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F7]">
              {jobMaterials.map(jm => (
                <tr key={jm.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 text-[#1A1A2E]">
                    {jm.materials?.name ?? '—'}
                    {jm.materials?.unit && (
                      <span className="text-[#6B7280] text-xs ml-1">({jm.materials.unit})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[#6B7280]">{jm.quantity}</td>
                  <td className="px-4 py-3 text-right text-[#6B7280]">{fmtCurrency(jm.unit_cost)}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#1A1A2E]">
                    {fmtCurrency(jm.quantity * jm.unit_cost)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(jm.id)}
                      disabled={deletingId === jm.id}
                      className="text-xs text-[#EF4444]/70 hover:text-[#EF4444] transition-colors disabled:opacity-50"
                    >
                      {deletingId === jm.id ? '…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#E5E7EB] bg-[#F4F5F7]">
                <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  Total Materials Cost
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#1A1A2E]">
                  {fmtCurrency(totalCost)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
