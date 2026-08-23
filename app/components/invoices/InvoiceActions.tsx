'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Invoice, Client, Job, Quote } from '@/lib/types'
import EditInvoiceModal from './EditInvoiceModal'
import Button from '@/app/components/ui/Button'

interface Props {
  invoice: Invoice
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  jobs: Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  quotes: Pick<Quote, 'id' | 'client_id' | 'total'>[]
}

export default function InvoiceActions({ invoice, clients, jobs, quotes }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('invoices').delete().eq('id', invoice.id)
    window.location.href = '/invoices'
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button onClick={() => setShowEdit(true)} variant="primary">
          Edit Invoice
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
        <EditInvoiceModal
          invoice={invoice}
          clients={clients}
          jobs={jobs}
          quotes={quotes}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}
