import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Client, Job, Quote, Invoice, Site, Notification } from '@/lib/types'
import ClientTabs from '@/app/components/clients/ClientTabs'
import { StatusBadge } from '@/app/components/ui/Badge'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const [
    { data: client },
    { data: jobs },
    { data: quotes },
    { data: invoices },
    { data: sites },
    { data: notifSettings },
    { data: notifications },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('jobs').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('sites').select('*').eq('client_id', id).order('created_at', { ascending: true }),
    supabase.from('client_notification_settings').select('notification_type, enabled').eq('client_id', id),
    supabase.from('notifications').select('id, client_id, job_id, type, status, sent_at, scheduled_for, created_at, review_link')
      .eq('client_id', id).order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A2E] transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Clients
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">{client.name}</h1>
          <StatusBadge status={client.is_active ? 'active' : 'inactive'} />
        </div>
        {client.business_name && (
          <p className="text-sm text-[#6B7280]">{client.business_name}</p>
        )}
      </div>

      <ClientTabs
        client={client as Client}
        jobs={(jobs ?? []) as unknown as Job[]}
        quotes={(quotes ?? []) as unknown as Quote[]}
        invoices={(invoices ?? []) as unknown as Invoice[]}
        sites={(sites ?? []) as unknown as Site[]}
        notifSettings={notifSettings ?? []}
        notifications={(notifications ?? []) as unknown as Notification[]}
      />
    </div>
  )
}
