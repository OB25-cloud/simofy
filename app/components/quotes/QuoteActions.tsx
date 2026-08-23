'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Quote, Client, Job } from '@/lib/types'
import EditQuoteModal from './EditQuoteModal'
import Button from '@/app/components/ui/Button'

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
        <Button onClick={() => setShowEdit(true)} variant="primary">
          Edit Quote
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
