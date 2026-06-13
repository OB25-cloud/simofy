import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { JobPhoto } from '@/lib/types'
import JobPhotos from '@/app/components/jobs/JobPhotos'
import JobActions from '@/app/components/jobs/JobActions'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending' },
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled' },
  in_progress: { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'In Progress' },
  complete:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Complete' },
  invoiced:    { bg: '#faf5ff', text: '#7c3aed', dot: '#8b5cf6', label: 'Invoiced' },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled' },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-sm">—</span>
  const config = STATUS_CONFIG[status] ?? { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: status }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  )
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const [{ data: job }, { data: photos, error: photosError }, { data: clients }, { data: staff }] = await Promise.all([
    supabase.from('jobs').select('*, clients(name, business_name), staff(name)').eq('id', id).single(),
    supabase.from('job_photos').select('*').eq('job_id', id).order('taken_at', { ascending: true }),
    supabase.from('clients').select('id, name, business_name').order('name'),
    supabase.from('staff').select('id, name').eq('is_active', true).order('name'),
  ])

  console.log('[JobDetailPage] job_photos fetch — count:', photos?.length ?? 0, '| error:', photosError ? { code: photosError.code, message: photosError.message } : null)

  if (!job) notFound()

  const photoList: JobPhoto[] = photos ?? []

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              {job.title ?? job.job_type ?? 'Untitled Job'}
            </h1>
            <StatusBadge status={job.status} />
          </div>
          {job.clients?.name && (
            <p className="text-gray-500">{job.clients.name}</p>
          )}
        </div>
        <JobActions job={job} clients={clients ?? []} staff={staff ?? []} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="rounded-lg border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Job Details
          </h2>
          <dl className="space-y-3.5">
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Job Type</dt>
              <dd className="text-sm text-gray-900">
                {job.job_type ?? <span className="text-gray-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Client</dt>
              <dd className="text-sm text-gray-900">
                {job.client_id ? (
                  <Link
                    href={`/clients/${job.client_id}`}
                    className="hover:underline"
                    style={{ color: '#B8922A' }}
                  >
                    {job.clients?.name ?? 'View client'}
                  </Link>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Assigned To</dt>
              <dd className="text-sm text-gray-900">
                {job.staff?.name ?? <span className="text-gray-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Location</dt>
              <dd className="text-sm text-gray-900">
                {job.location ?? <span className="text-gray-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Scheduled Date</dt>
              <dd className="text-sm text-gray-900">
                {job.scheduled_date
                  ? new Date(job.scheduled_date).toLocaleDateString('en-NZ', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : <span className="text-gray-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Created</dt>
              <dd className="text-sm text-gray-900">
                {job.created_at
                  ? new Date(job.created_at).toLocaleDateString('en-NZ', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : <span className="text-gray-300">—</span>}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Notes
          </h2>
          {job.notes ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.notes}</p>
          ) : (
            <p className="text-sm text-gray-300 italic">No notes added</p>
          )}
        </div>
      </div>

      {/* Photos — client component for upload interactivity */}
      <JobPhotos jobId={id} initialPhotos={photoList} />
    </div>
  )
}
