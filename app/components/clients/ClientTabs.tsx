'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Client, Job, Quote, Invoice, Site, Notification } from '@/lib/types'
import SitesSection from './SitesSection'
import NotificationsSection from './NotificationsSection'
import CommunicationsSection from './CommunicationsSection'

type NotifSetting = { notification_type: string; enabled: boolean }

const JOB_STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending'     },
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled'   },
  in_progress: { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'In Progress' },
  complete:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Complete'     },
  invoiced:    { bg: '#faf5ff', text: '#7c3aed', dot: '#8b5cf6', label: 'Invoiced'    },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled'   },
}

const QUOTE_STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:    { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Draft'    },
  sent:     { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Sent'     },
  accepted: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Accepted' },
  declined: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Declined' },
  expired:  { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Expired'  },
}

const INV_STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Draft'     },
  sent:      { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Sent'      },
  paid:      { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Paid'      },
  overdue:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Overdue'   },
  cancelled: { bg: '#f9fafb', text: '#374151', dot: '#6b7280', label: 'Cancelled' },
}

function StatusBadge({
  status,
  config,
}: {
  status: string | null
  config: Record<string, { bg: string; text: string; dot: string; label: string }>
}) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const c = config[status] ?? { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: status }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">
      {children}
    </th>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 py-10 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}

function fmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : '—'
}

function fmtDate(s: string | null | undefined) {
  if (!s) return <span className="text-gray-300">—</span>
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TABS = [
  { key: 'overview',      label: 'Overview'      },
  { key: 'jobs',          label: 'Jobs'           },
  { key: 'quotes',        label: 'Quotes'         },
  { key: 'invoices',      label: 'Invoices'       },
  { key: 'sites',         label: 'Sites'          },
  { key: 'notifications', label: 'Notifications'  },
  { key: 'communications',label: 'Communications' },
]

interface Props {
  client: Client
  jobs: Job[]
  quotes: Quote[]
  invoices: Invoice[]
  sites: Site[]
  notifSettings: NotifSetting[]
  notifications: Notification[]
}

export default function ClientTabs({ client, jobs, quotes, invoices, sites, notifSettings, notifications }: Props) {
  const [activeTab, setActiveTab] = useState('overview')

  const totalInvoiced = invoices.reduce((s: number, inv) => s + (inv.total ?? 0), 0)
  const outstanding = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((s: number, inv) => s + (inv.total ?? 0), 0)

  return (
    <>
      {/* Tab bar */}
      <div className="border-b border-gray-100 mb-6">
        <nav className="-mb-px flex gap-1">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 pb-3 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: active ? '#B8922A' : '#9ca3af',
                  borderBottom: active ? '2px solid #B8922A' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="tab-fade-in">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Jobs',     value: String(jobs.length) },
              { label: 'Total Invoiced', value: `$${totalInvoiced.toFixed(0)}` },
              { label: 'Outstanding',    value: `$${outstanding.toFixed(0)}` },
            ].map(stat => (
              <div key={stat.label} className="rounded-lg border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5">
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
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-gray-100 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Notes</h2>
              {client.notes ? (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
              ) : (
                <p className="text-sm text-gray-300 italic">No notes added</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Jobs */}
      {activeTab === 'jobs' && (
        <div className="tab-fade-in">
          <p className="text-xs text-gray-400 mb-4">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </p>
          {jobs.length === 0 ? (
            <EmptyState message="No jobs linked to this client yet" />
          ) : (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <Th>Job</Th>
                    <Th>Status</Th>
                    <Th>Scheduled</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, i) => (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-medium hover:underline"
                          style={{ color: '#B8922A' }}
                        >
                          {job.title ?? job.job_type ?? <span className="text-gray-300">Untitled</span>}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={job.status} config={JOB_STATUS} />
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(job.scheduled_date)}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(job.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quotes */}
      {activeTab === 'quotes' && (
        <div className="tab-fade-in">
          <p className="text-xs text-gray-400 mb-4">
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
          </p>
          {quotes.length === 0 ? (
            <EmptyState message="No quotes for this client yet" />
          ) : (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <Th>Quote #</Th>
                    <Th>Status</Th>
                    <Th>Total</Th>
                    <Th>Valid Until</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q, i) => (
                    <tr
                      key={q.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/quotes/${q.id}`}
                          className="font-medium hover:underline"
                          style={{ color: '#B8922A' }}
                        >
                          Q-{q.id.slice(0, 6).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={q.status} config={QUOTE_STATUS} />
                      </td>
                      <td className="px-5 py-3.5 text-gray-900">{fmt(q.total)}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(q.valid_until)}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(q.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div className="tab-fade-in">
          <p className="text-xs text-gray-400 mb-4">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
          {invoices.length === 0 ? (
            <EmptyState message="No invoices for this client yet" />
          ) : (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <Th>Invoice #</Th>
                    <Th>Status</Th>
                    <Th>Total</Th>
                    <Th>Due</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium hover:underline"
                          style={{ color: '#B8922A' }}
                        >
                          INV-{inv.id.slice(0, 6).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={inv.status} config={INV_STATUS} />
                      </td>
                      <td className="px-5 py-3.5 text-gray-900">{fmt(inv.total)}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(inv.due_date)}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(inv.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sites */}
      {activeTab === 'sites' && (
        <div className="tab-fade-in">
          <SitesSection clientId={client.id} sites={sites} />
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="tab-fade-in">
          <NotificationsSection clientId={client.id} initialSettings={notifSettings} />
        </div>
      )}

      {/* Communications */}
      {activeTab === 'communications' && (
        <div className="tab-fade-in">
          <CommunicationsSection notifications={notifications} />
        </div>
      )}
    </>
  )
}
