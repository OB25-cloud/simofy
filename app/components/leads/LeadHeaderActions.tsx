'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'
import EditLeadModal from './EditLeadModal'
import Button from '@/app/components/ui/Button'

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

      {showEdit && <EditLeadModal lead={lead} onClose={() => setShowEdit(false)} />}
    </>
  )
}
