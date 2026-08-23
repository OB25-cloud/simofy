'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'
import EditLeadModal from './EditLeadModal'

const STATUS_OPTIONS: { value: string; label: string; color: string; active: string }[] = [
  { value: 'new',       label: 'New',       color: '#C9A84C', active: '#fdf8ee' },
  { value: 'contacted', label: 'Contacted', color: '#1d4ed8', active: '#eff6ff' },
  { value: 'converted', label: 'Converted', color: '#15803d', active: '#f0fdf4' },
  { value: 'lost',      label: 'Lost',      color: '#6B7280', active: '#F4F5F7' },
]

interface Props {
  lead: Lead
}

export default function LeadActions({ lead }: Props) {
  const [showEdit, setShowEdit]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [updating, setUpdating]         = useState(false)
  const [currentStatus, setCurrentStatus] = useState(lead.status ?? 'new')

  async function handleStatusChange(status: string) {
    if (status === currentStatus || updating) return
    setUpdating(true)
    await supabase.from('leads').update({ status }).eq('id', lead.id)
    setCurrentStatus(status)
    setUpdating(false)
    window.location.reload()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('leads').delete().eq('id', lead.id)
    window.location.href = '/leads'
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Quick status change */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(opt => {
              const isActive = currentStatus === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={updating}
                  className="px-3 py-1.5 rounded-md text-xs font-medium border transition-all disabled:opacity-50"
                  style={isActive
                    ? { background: opt.active, color: opt.color, borderColor: opt.color, opacity: 1 }
                    : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }
                  }
                >
                  {opt.label}
                  {isActive && (
                    <span className="ml-1.5">✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Edit / Delete */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="px-4 py-3 sm:py-2 text-sm font-medium text-[#1A1A2E] font-semibold rounded-md transition-opacity hover:opacity-90"
            style={{ background: '#C9A84C' }}
          >
            Edit Lead
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Are you sure?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-3 sm:py-2 text-sm font-medium text-white bg-[#EF4444] rounded-md hover:bg-[#DC2626] transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-3 sm:py-2 text-sm font-medium bg-white border border-[#E5E7EB] text-[#1A1A2E] rounded-md hover:bg-[#F4F5F7] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-3 sm:py-2 text-sm font-medium bg-white border border-[#E5E7EB] text-[#1A1A2E] rounded-md hover:bg-[#F4F5F7] transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {showEdit && <EditLeadModal lead={{ ...lead, status: currentStatus }} onClose={() => setShowEdit(false)} />}
    </>
  )
}
