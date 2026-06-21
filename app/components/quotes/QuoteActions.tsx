'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Quote, Client, Job } from '@/lib/types'
import EditQuoteModal from './EditQuoteModal'

interface Props {
  quote: Quote
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  jobs: Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
}

export default function QuoteActions({ quote, clients, jobs }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('quote_line_items').delete().eq('quote_id', quote.id)
    await supabase.from('quotes').delete().eq('id', quote.id)
    window.location.href = '/quotes'
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEdit(true)}
          className="px-4 py-3 sm:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90"
          style={{ background: '#B8922A' }}
        >
          Edit Quote
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

      {showEdit && (
        <EditQuoteModal
          quote={quote}
          clients={clients}
          jobs={jobs}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}
