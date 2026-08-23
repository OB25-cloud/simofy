'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Staff } from '@/lib/types'
import EditStaffModal from './EditStaffModal'
import Button from '@/app/components/ui/Button'

export default function StaffActions({ staff }: { staff: Staff }) {
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('staff').delete().eq('id', staff.id)
    window.location.href = '/staff'
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <Button onClick={() => setShowEdit(true)} variant="secondary">
          Edit
        </Button>

        {confirmDelete ? (
          <>
            <span className="text-xs text-[#6B7280]">Delete this staff member?</span>
            <Button onClick={handleDelete} disabled={deleting} variant="destructive">
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </Button>
            <Button onClick={() => setConfirmDelete(false)} variant="secondary">
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={() => setConfirmDelete(true)} variant="destructive">
            Delete
          </Button>
        )}
      </div>

      {showEdit && (
        <EditStaffModal staff={staff} onClose={() => setShowEdit(false)} />
      )}
    </>
  )
}
