'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'
import EditLeadModal from './EditLeadModal'

interface Props {
  lead: Lead
}

export default function LeadHeaderActions({ lead }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('leads').delete().eq('id', lead.id)
    window.location.href = '/leads'
  }

  return (
    <>
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

      {showEdit && <EditLeadModal lead={lead} onClose={() => setShowEdit(false)} />}
    </>
  )
}
