'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'
import EditLeadModal from './EditLeadModal'

const STATUS_OPTIONS: { value: string; label: string; color: string; active: string }[] = [
  { value: 'new',       label: 'New',       color: '#B8922A', active: '#fdf8ee' },
  { value: 'contacted', label: 'Contacted', color: '#1d4ed8', active: '#eff6ff' },
  { value: 'converted', label: 'Converted', color: '#15803d', active: '#f0fdf4' },
  { value: 'lost',      label: 'Lost',      color: '#6b7280', active: '#f3f4f6' },
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
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</p>
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
                    : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }
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
            className="px-4 py-3 sm:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90"
            style={{ background: '#B8922A' }}
          >
            Edit Lead
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Are you sure?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-3 sm:py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-3 sm:py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-3 sm:py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
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
