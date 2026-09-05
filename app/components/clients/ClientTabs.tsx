'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Client, Job, Quote, Invoice, Site, Notification } from '@/lib/types'
import SitesSection from './SitesSection'
import NotificationsSection from './NotificationsSection'
import CommunicationsSection from './CommunicationsSection'
import { StatusBadge } from '@/app/components/ui/Badge'

type NotifSetting = { notification_type: string; enabled: boolean }

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">
      {children}
    </th>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted py-10 text-center">
      <p className="text-sm text-ink-muted">{message}</p>
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
      <div className="border-b border-line mb-6 overflow-x-auto scrollbar-hidden">
        <nav className="-mb-px flex gap-1 min-w-max">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 pt-3 md:pt-0 pb-3 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: active ? 'var(--accent)' : 'var(--ink-muted)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
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
              <div key={stat.label} className="bg-white rounded-xl border border-line shadow-sm p-4">
                <p className="text-xs text-ink-muted mb-1">{stat.label}</p>
                <p className="text-xl font-semibold text-ink">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-line shadow-sm p-6">
              <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">
                Contact Details
              </h2>
              <dl className="space-y-3.5">
                <div>
                  <dt className="text-xs text-ink-muted mb-0.5">Email</dt>
                  <dd className="text-sm text-ink">
                    {client.email ? (
                      <a href={`mailto:${client.email}`} className="hover:underline" style={{ color: 'var(--accent)' }}>
                        {client.email}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted mb-0.5">Phone</dt>
                  <dd className="text-sm text-ink">
                    {client.phone ? (
                      <a href={`tel:${client.phone}`} className="hover:underline" style={{ color: 'var(--accent)' }}>
                        {client.phone}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted mb-0.5">Address</dt>
                  <dd className="text-sm text-ink">
                    {client.address ?? <span className="text-gray-300">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted mb-0.5">Client Since</dt>
                  <dd className="text-sm text-ink">
                    {new Date(client.created_at).toLocaleDateString('en-NZ', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-xl border border-line shadow-sm p-6">
              <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Notes</h2>
              {client.notes ? (
                <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">{client.notes}</p>
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
          <p className="text-xs text-ink-muted mb-4">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </p>
          {jobs.length === 0 ? (
            <EmptyState message="No jobs linked to this client yet" />
          ) : (
            <div className="bg-white rounded-xl border border-line shadow-sm overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-surface-muted border-b border-line">
                    <Th>Job</Th>
                    <Th>Status</Th>
                    <Th>Scheduled</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr
                      key={job.id}
                      className="border-t border-line-soft hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          {job.title ?? job.job_type ?? <span className="text-gray-300">Untitled</span>}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(job.scheduled_date)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(job.created_at)}</td>
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
          <p className="text-xs text-ink-muted mb-4">
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
          </p>
          {quotes.length === 0 ? (
            <EmptyState message="No quotes for this client yet" />
          ) : (
            <div className="bg-white rounded-xl border border-line shadow-sm overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-surface-muted border-b border-line">
                    <Th>Quote #</Th>
                    <Th>Status</Th>
                    <Th>Total</Th>
                    <Th>Valid Until</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(q => (
                    <tr
                      key={q.id}
                      className="border-t border-line-soft hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/quotes/${q.id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          Q-{q.id.slice(0, 6).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="px-5 py-3.5 text-ink">{fmt(q.total)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(q.valid_until)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(q.created_at)}</td>
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
          <p className="text-xs text-ink-muted mb-4">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
          {invoices.length === 0 ? (
            <EmptyState message="No invoices for this client yet" />
          ) : (
            <div className="bg-white rounded-xl border border-line shadow-sm overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-surface-muted border-b border-line">
                    <Th>Invoice #</Th>
                    <Th>Status</Th>
                    <Th>Total</Th>
                    <Th>Due</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr
                      key={inv.id}
                      className="border-t border-line-soft hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          INV-{inv.id.slice(0, 6).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3.5 text-ink">{fmt(inv.total)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(inv.due_date)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(inv.created_at)}</td>
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
