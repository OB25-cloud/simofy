'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Job, Client, Staff } from '@/lib/types'
import EditJobModal from './EditJobModal'

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
        <button
          onClick={() => setShowEdit(true)}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Edit
        </button>

        {confirmDelete ? (
          <>
            <span className="text-xs text-gray-500">Delete this job?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-1.5 text-sm font-medium text-red-500 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {showEdit && (
        <EditJobModal job={job} clients={clients} staff={staff} onClose={() => setShowEdit(false)} />
      )}
    </>
  )
}
