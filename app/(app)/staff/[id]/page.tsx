import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Job } from '@/lib/types'
import StaffActions from '@/app/components/staff/StaffActions'

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: '#fdf8ee', text: '#B8922A', label: 'Admin' },
  field: { bg: '#eff6ff', text: '#1d4ed8', label: 'Field' },
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending' },
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled' },
  in_progress: { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'In Progress' },
  complete:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Complete' },
  invoiced:    { bg: '#faf5ff', text: '#7c3aed', dot: '#8b5cf6', label: 'Invoiced' },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled' },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const config = STATUS_CONFIG[status] ?? { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: status }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  )
}

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: staff }, { data: jobs }] = await Promise.all([
    supabase.from('staff').select('*').eq('id', id).single(),
    supabase.from('jobs').select('*, clients(name)').eq('staff_id', id).order('created_at', { ascending: false }),
  ])

  if (!staff) notFound()

  const jobList: Job[] = jobs ?? []
  const roleConfig = staff.role ? (ROLE_CONFIG[staff.role] ?? null) : null

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Staff
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">{staff.name}</h1>
            {roleConfig && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: roleConfig.bg, color: roleConfig.text }}
              >
                {roleConfig.label}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={
                staff.is_active
                  ? { background: '#fdf8ee', color: '#B8922A' }
                  : { background: '#f3f4f6', color: '#9ca3af' }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: staff.is_active ? '#B8922A' : '#d1d5db' }}
              />
              {staff.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <StaffActions staff={staff} />
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
                {staff.email ? (
                  <a href={`mailto:${staff.email}`} className="hover:underline" style={{ color: '#B8922A' }}>
                    {staff.email}
                  </a>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Phone</dt>
              <dd className="text-sm text-gray-900">
                {staff.phone ? (
                  <a href={`tel:${staff.phone}`} className="hover:underline" style={{ color: '#B8922A' }}>
                    {staff.phone}
                  </a>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Member Since</dt>
              <dd className="text-sm text-gray-900">
                {new Date(staff.created_at).toLocaleDateString('en-NZ', {
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
            Employment
          </h2>
          <dl className="space-y-3.5">
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Role</dt>
              <dd className="text-sm text-gray-900">
                {roleConfig ? roleConfig.label : (staff.role ?? <span className="text-gray-300">—</span>)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Pay Rate</dt>
              <dd className="text-sm text-gray-900">
                {staff.pay_rate != null
                  ? `$${Number(staff.pay_rate).toFixed(2)}/hr`
                  : <span className="text-gray-300">—</span>}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Assigned Jobs */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Assigned Jobs
          <span className="ml-2 text-sm font-normal text-gray-400">({jobList.length})</span>
        </h2>

        {jobList.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-gray-50 py-10 text-center">
            <p className="text-sm text-gray-400">No jobs assigned to this staff member</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Title</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Scheduled</th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {jobList.map((job, i) => (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 transition-colors group"
                    style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      <Link href={`/jobs/${job.id}`} className="hover:underline" style={{ color: 'inherit' }}>
                        {job.title ?? job.job_type ?? <span className="text-gray-300">—</span>}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {job.clients?.name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {job.scheduled_date
                        ? new Date(job.scheduled_date).toLocaleDateString('en-NZ', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/jobs/${job.id}`}>
                        <span className="text-gray-300 group-hover:text-[#B8922A] transition-colors text-base">→</span>
                      </Link>
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
