'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'

const TABS = ['Overview', 'Activity'] as const
type Tab = typeof TABS[number]

const GOLD = '#B8922A'

const STATUS_OPTIONS = [
  { value: 'new',       label: 'New'       },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost',      label: 'Lost'      },
] as const

function fmtDate(s: string | null | undefined, long = false) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NZ', long
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric' }
  )
}

interface Props {
  lead: Lead
}

export default function LeadDetailTabs({ lead }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [currentStatus, setCurrentStatus] = useState(lead.status ?? 'new')
  const [updating, setUpdating] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')

  async function handleStatusChange(status: string) {
    if (status === currentStatus || updating) return
    setUpdating(true)
    await supabase.from('leads').update({ status }).eq('id', lead.id)
    setCurrentStatus(status)
    setUpdating(false)
    router.refresh()
  }

  async function handleConvertToClient() {
    setConverting(true)
    setConvertError('')

    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: lead.name ?? 'Unnamed',
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        is_active: true,
      })
      .select('id')
      .single()

    if (error || !data) {
      setConvertError(error?.message ?? 'Failed to create client')
      setConverting(false)
      return
    }

    window.location.href = `/clients/${data.id}`
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{ color: activeTab === tab ? '#111827' : '#6b7280' }}
          >
            {tab}
            {activeTab === tab && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: GOLD }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'Overview' && (
        <div className="space-y-4">
          {/* Contact details */}
          <div className="rounded-lg border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact Details</p>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Email</dt>
                <dd className="text-sm text-gray-900">
                  {lead.email
                    ? <a href={`mailto:${lead.email}`} className="hover:underline" style={{ color: GOLD }}>{lead.email}</a>
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Phone</dt>
                <dd className="text-sm text-gray-900">
                  {lead.phone
                    ? <a href={`tel:${lead.phone}`} className="hover:underline" style={{ color: GOLD }}>{lead.phone}</a>
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Source</dt>
                <dd className="text-sm text-gray-900">{lead.source ?? <span className="text-gray-300">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Received</dt>
                <dd className="text-sm text-gray-900">{fmtDate(lead.created_at, true)}</dd>
              </div>
            </dl>
          </div>

          {/* Message */}
          {lead.message && (
            <div className="rounded-lg border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Message</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="rounded-lg border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Status */}
          <div className="rounded-lg border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => {
                const isActive = currentStatus === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    disabled={updating}
                    className="px-4 py-1.5 rounded-md text-xs font-medium border transition-all disabled:opacity-50"
                    style={
                      isActive
                        ? { background: GOLD, color: '#fff', borderColor: GOLD }
                        : { background: '#fff', color: GOLD, borderColor: GOLD }
                    }
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {/* Convert to Client */}
            {currentStatus === 'converted' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={handleConvertToClient}
                  disabled={converting}
                  className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#15803d' }}
                >
                  {converting ? 'Creating client…' : 'Convert to Client'}
                </button>
                <p className="mt-1.5 text-xs text-gray-400">
                  Creates a new client with this lead&apos;s name, email, and phone.
                </p>
                {convertError && <p className="mt-1 text-xs text-red-500">{convertError}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity */}
      {activeTab === 'Activity' && (
        <div className="rounded-lg border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Activity</p>
          <ol className="relative border-l border-gray-200 ml-2 space-y-6">
            {/* Created */}
            <li className="pl-5">
              <span
                className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                style={{ background: GOLD }}
              />
              <p className="text-xs font-medium text-gray-700">Lead received</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtDate(lead.created_at, false)}</p>
              {lead.source && (
                <p className="text-xs text-gray-400">via {lead.source}</p>
              )}
            </li>

            {/* Contacted */}
            {(currentStatus === 'contacted' || currentStatus === 'converted' || currentStatus === 'lost') && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#3b82f6' }}
                />
                <p className="text-xs font-medium text-gray-700">Lead contacted</p>
                <p className="text-xs text-gray-400 mt-0.5">Date not recorded</p>
              </li>
            )}

            {/* Converted */}
            {currentStatus === 'converted' && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#22c55e' }}
                />
                <p className="text-xs font-medium text-gray-700">Lead converted</p>
              </li>
            )}

            {/* Lost */}
            {currentStatus === 'lost' && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#d1d5db' }}
                />
                <p className="text-xs font-medium text-gray-700">Lead marked as lost</p>
              </li>
            )}
          </ol>
        </div>
      )}
    </div>
  )
}
