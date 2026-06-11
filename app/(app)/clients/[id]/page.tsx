import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Job, Site } from '@/lib/types'
import SitesSection from '@/app/components/clients/SitesSection'

function JobStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>

  const s = status.toLowerCase()
  let cls = 'bg-gray-100 text-gray-600'
  if (s === 'complete' || s === 'completed') cls = 'bg-green-50 text-green-700'
  else if (s.includes('progress')) cls = 'bg-blue-50 text-blue-700'
  else if (s.includes('payment')) cls = 'bg-yellow-50 text-yellow-700'
  else if (s.includes('cancel')) cls = 'bg-red-50 text-red-600'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: client }, { data: jobs }, { data: sites }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('jobs').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('sites').select('*').eq('client_id', id).order('created_at', { ascending: true }),
  ])

  if (!client) notFound()

  const jobList: Job[] = jobs ?? []
  const siteList: Site[] = sites ?? []

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
      <div className="mb-8 flex items-start justify-between">
        <div>
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
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="rounded-lg border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Contact Details
          </h2>
          <dl className="space-y-3.5">
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Email</dt>
              <dd className="text-sm text-gray-900">
                {client.email ? (
                  <a href={`mailto:${client.email}`} className="hover:underline" style={{ color: '#B8922A' }}>
                    {client.email}
                  </a>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Phone</dt>
              <dd className="text-sm text-gray-900">
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="hover:underline" style={{ color: '#B8922A' }}>
                    {client.phone}
                  </a>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Address</dt>
              <dd className="text-sm text-gray-900">
                {client.address ?? <span className="text-gray-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Client Since</dt>
              <dd className="text-sm text-gray-900">
                {new Date(client.created_at).toLocaleDateString('en-NZ', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Notes
          </h2>
          {client.notes ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {client.notes}
            </p>
          ) : (
            <p className="text-sm text-gray-300 italic">No notes added</p>
          )}
        </div>
      </div>

      {/* Sites — Client Component to support Add Site modal */}
      <SitesSection clientId={id} sites={siteList} />

      {/* Jobs */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Jobs
          <span className="ml-2 text-sm font-normal text-gray-400">({jobList.length})</span>
        </h2>

        {jobList.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-gray-50 py-10 text-center">
            <p className="text-sm text-gray-400">No jobs linked to this client yet</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {jobList.map((job, i) => (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {job.job_type ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {job.created_at
                        ? new Date(job.created_at).toLocaleDateString('en-NZ', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
