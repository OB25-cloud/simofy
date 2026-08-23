'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'
import EditLeadModal from './EditLeadModal'
import Button from '@/app/components/ui/Button'

const STATUS_OPTIONS: { value: string; label: string; color: string; active: string }[] = [
  { value: 'new',       label: 'New',       color: '#B45309', active: '#FEF3C7' },
  { value: 'contacted', label: 'Contacted', color: '#1D4ED8', active: '#DBEAFE' },
  { value: 'converted', label: 'Converted', color: '#15803D', active: '#DCFCE7' },
  { value: 'lost',      label: 'Lost',      color: '#B91C1C', active: '#FEE2E2' },
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
          <Button onClick={() => setShowEdit(true)} variant="primary">
            Edit Lead
          </Button>

          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6B7280]">Are you sure?</span>
              <Button onClick={handleDelete} disabled={deleting} variant="destructive">
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button onClick={() => setConfirmDelete(false)} variant="secondary">
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setConfirmDelete(true)} variant="destructive">
              Delete
            </Button>
          )}
        </div>
      </div>

      {showEdit && <EditLeadModal lead={{ ...lead, status: currentStatus }} onClose={() => setShowEdit(false)} />}
    </>
  )
}
