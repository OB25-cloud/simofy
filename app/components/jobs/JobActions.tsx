'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Job, Client, Staff } from '@/lib/types'
import EditJobModal from './EditJobModal'
import Button from '@/app/components/ui/Button'

interface Props {
  job: Job
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  staff: Pick<Staff, 'id' | 'name'>[]
}

export default function JobActions({ job, clients, staff }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('jobs').delete().eq('id', job.id)
    window.location.href = '/jobs'
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <Button onClick={() => setShowEdit(true)} variant="secondary">
          Edit
        </Button>

        {confirmDelete ? (
          <>
            <span className="text-xs text-[#6B7280]">Delete this job?</span>
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
        <EditJobModal job={job} clients={clients} staff={staff} onClose={() => setShowEdit(false)} />
      )}
    </>
  )
}
