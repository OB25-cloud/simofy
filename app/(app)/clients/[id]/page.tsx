import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Client, Job, Quote, Invoice, Site } from '@/lib/types'
import ClientTabs from '@/app/components/clients/ClientTabs'

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
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('jobs').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('sites').select('*').eq('client_id', id).order('created_at', { ascending: true }),
    supabase.from('client_notification_settings').select('notification_type, enabled').eq('client_id', id),
  ])

  if (!client) notFound()

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Clients
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={
              client.is_active
                ? { background: '#fdf8ee', color: '#B8922A' }
                : { background: '#f3f4f6', color: '#9ca3af' }
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: client.is_active ? '#B8922A' : '#d1d5db' }}
            />
            {client.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {client.business_name && (
          <p className="text-gray-500">{client.business_name}</p>
        )}
      </div>

      <ClientTabs
        client={client as Client}
        jobs={(jobs ?? []) as unknown as Job[]}
        quotes={(quotes ?? []) as unknown as Quote[]}
        invoices={(invoices ?? []) as unknown as Invoice[]}
        sites={(sites ?? []) as unknown as Site[]}
        notifSettings={notifSettings ?? []}
      />
    </div>
  )
}
