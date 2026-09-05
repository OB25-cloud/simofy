import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Client, Job, Quote, Invoice, Site, Notification } from '@/lib/types'
import ClientTabs from '@/app/components/clients/ClientTabs'
import { ClientAvatar, ClientStatusBadge } from '@/app/components/clients/ClientsView'

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
    supabase.from('jobs').select('*, staff(name)').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*, jobs(title, job_type)').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('sites').select('*').eq('client_id', id).order('created_at', { ascending: true }),
    supabase.from('client_notification_settings').select('notification_type, enabled').eq('client_id', id),
    supabase.from('notifications').select('id, client_id, job_id, type, status, sent_at, scheduled_for, created_at, review_link')
      .eq('client_id', id).order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  const typed = client as Client
  const since = new Date(typed.created_at).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Clients
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-center gap-4 min-w-0">
        <ClientAvatar id={typed.id} name={typed.name} size="xl" inactive={!typed.is_active} />
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink truncate">{typed.name}</h1>
            <ClientStatusBadge active={typed.is_active} />
          </div>
          <p className="mt-1 text-xs text-ink-muted flex items-center gap-3 flex-wrap">
            {typed.business_name && <span className="text-ink font-medium">{typed.business_name}</span>}
            <span>Client since {since}</span>
            {typed.phone && <a href={`tel:${typed.phone}`} className="hover:text-accent transition-colors tabular-nums">{typed.phone}</a>}
            {typed.email && <a href={`mailto:${typed.email}`} className="hover:text-accent transition-colors truncate">{typed.email}</a>}
          </p>
        </div>
      </div>

      <ClientTabs
        client={typed}
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
