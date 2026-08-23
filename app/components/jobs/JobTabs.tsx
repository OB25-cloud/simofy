'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Job, JobPhoto, JobNote, Material, JobMaterial, ChecklistTemplate, JobChecklistItem, PurchaseOrder } from '@/lib/types'
import { formatTime } from '@/lib/timeOptions'
import JobPhotos from './JobPhotos'
import MaterialsSection from './MaterialsSection'
import ChecklistSection from './ChecklistSection'
import PurchaseOrdersSection from './PurchaseOrdersSection'
import { StatusBadge } from '@/app/components/ui/Badge'
import Button from '@/app/components/ui/Button'

const RECURRENCE_LABELS: Record<string, string> = {
  weekly:      'Weekly',
  fortnightly: 'Fortnightly',
  monthly:     'Monthly',
}

function fmtDate(s: string | null | undefined) {
  if (!s) return <span className="text-gray-300">—</span>
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

const TABS = [
  { key: 'overview',        label: 'Overview'        },
  { key: 'notes',           label: 'Notes'            },
  { key: 'photos',          label: 'Photos'           },
  { key: 'materials',       label: 'Materials'        },
  { key: 'purchase_orders', label: 'Purchase Orders'  },
  { key: 'checklist',       label: 'Checklist'        },
  { key: 'activity',        label: 'Activity'         },
]

interface Props {
  job: Job
  initialPhotos: JobPhoto[]
  initialNotes: JobNote[]
  materials: Material[]
  initialJobMaterials: JobMaterial[]
  initialPurchaseOrders: PurchaseOrder[]
  quoteTotal: number | null
  checklistTemplates: Pick<ChecklistTemplate, 'id' | 'name'>[]
  initialChecklistItems: JobChecklistItem[]
  isAdmin: boolean
  currentUserDisplayName: string
}

export default function JobTabs({
  job,
  initialPhotos,
  initialNotes,
  materials,
  initialJobMaterials,
  initialPurchaseOrders,
  quoteTotal,
  checklistTemplates,
  initialChecklistItems,
  isAdmin,
  currentUserDisplayName,
}: Props) {
  const [activeTab, setActiveTab] = useState('overview')
  const [notes, setNotes] = useState<JobNote[]>(initialNotes)
  // Lifted up to JobTabs (rather than owned inside ChecklistSection) because
  // tab content is conditionally rendered — switching tabs unmounts
  // ChecklistSection entirely, which would otherwise reset its state back to
  // initialChecklistItems (the page-load snapshot) every time you tab away
  // and back, making freshly-saved ticks look like they "didn't persist".
  const [checklistTemplateId, setChecklistTemplateId] = useState<string | null>(job.checklist_template_id)
  const [checklistItems, setChecklistItems] = useState<JobChecklistItem[]>(initialChecklistItems)
  // Same reason as checklistItems above — lifted so adding/updating a PO
  // survives switching away from the Purchase Orders tab and back.
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Cost summary calculations
  const materialsCost = initialJobMaterials.reduce((sum, m) => sum + m.quantity * m.unit_cost, 0)
  const purchaseOrdersCost = purchaseOrders
    .filter(po => po.status === 'received')
    .reduce((sum, po) => sum + po.amount, 0)
  const payRate = job.staff?.pay_rate ?? 0
  const labourCost = payRate * 2
  const totalCost = materialsCost + purchaseOrdersCost + labourCost
  const margin = quoteTotal !== null ? quoteTotal - totalCost : null

  async function handleAddNote() {
    const content = noteText.trim()
    if (!content) return
    setSaving(true)
    setNoteError('')
    const { data, error } = await supabase
      .from('job_notes')
      .insert({ job_id: job.id, content })
      .select()
      .single()
    if (error) {
      setNoteError(error.message)
    } else {
      setNotes(prev => [data, ...prev])
      setNoteText('')
    }
    setSaving(false)
  }

  function startEdit(note: JobNote) {
    setEditingId(note.id)
    setEditText(note.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  async function handleSaveEdit(id: string) {
    const content = editText.trim()
    if (!content) return
    console.log('[handleSaveEdit] starting — id:', id, '| content:', content)
    setUpdatingId(id)
    const { data, error } = await supabase
      .from('job_notes')
      .update({ content })
      .eq('id', id)
      .select()
      .single()
    console.log('[handleSaveEdit] result — data:', data, '| error:', error)
    if (!error && data) {
      setNotes(prev => prev.map(n => (n.id === id ? data : n)))
      setEditingId(null)
      setEditText('')
    }
    setUpdatingId(null)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    setDeletingId(id)
    const { error } = await supabase.from('job_notes').delete().eq('id', id)
    if (!error) {
      setNotes(prev => prev.filter(n => n.id !== id))
    }
    setDeletingId(null)
  }

  // Build activity timeline
  type TimelineEntry = { label: string; date: string; dotColor: string }
  const timeline: TimelineEntry[] = []
  if (job.created_at) {
    timeline.push({ label: 'Job Created', date: job.created_at, dotColor: '#6B7280' })
  }
  if (job.scheduled_date) {
    timeline.push({ label: 'Scheduled', date: job.scheduled_date, dotColor: '#3b82f6' })
  }
  if (job.completed_date) {
    timeline.push({ label: 'Completed', date: job.completed_date, dotColor: '#22c55e' })
  }
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <>
      {/* Tab bar */}
      <div className="border-b border-[#E5E7EB] mb-6 overflow-x-auto scrollbar-hidden">
        <nav className="-mb-px flex gap-1 min-w-max">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 pt-3 md:pt-0 pb-3 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: active ? '#C9A84C' : '#6B7280',
                  borderBottom: active ? '2px solid #C9A84C' : '2px solid transparent',
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
        <div className="space-y-5 tab-fade-in">
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">
                Job Details
              </h2>
              <dl className="space-y-3.5">
                <div>
                  <dt className="text-xs text-[#6B7280] mb-0.5">Status</dt>
                  <dd><StatusBadge status={job.status} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280] mb-0.5">Job Type</dt>
                  <dd className="text-sm text-[#1A1A2E]">
                    {job.job_type ?? <span className="text-gray-300">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280] mb-0.5">Recurrence</dt>
                  <dd className="text-sm text-[#1A1A2E]">
                    {job.recurrence_pattern
                      ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                            style={{ background: 'rgba(201, 168, 76,0.12)', color: '#C9A84C' }}
                          >
                            Recurring
                          </span>
                          {RECURRENCE_LABELS[job.recurrence_pattern] ?? job.recurrence_pattern}
                        </span>
                      )
                      : <span className="text-gray-300">One-off</span>
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280] mb-0.5">Client</dt>
                  <dd className="text-sm text-[#1A1A2E]">
                    {job.client_id ? (
                      <Link
                        href={`/clients/${job.client_id}`}
                        className="hover:underline"
                        style={{ color: '#C9A84C' }}
                      >
                        {job.clients?.name ?? 'View client'}
                      </Link>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280] mb-0.5">Assigned To</dt>
                  <dd className="text-sm text-[#1A1A2E]">
                    {job.staff?.name ?? <span className="text-gray-300">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280] mb-0.5">Location</dt>
                  <dd className="text-sm text-[#1A1A2E]">
                    {job.location ?? <span className="text-gray-300">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280] mb-0.5">Scheduled Date</dt>
                  <dd className="text-sm text-[#1A1A2E]">
                    {fmtDate(job.scheduled_date)}
                    {job.scheduled_date && job.start_time && job.end_time && (
                      <span className="text-[#6B7280]">
                        {' · '}{formatTime(job.start_time)} – {formatTime(job.end_time)}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280] mb-0.5">Created</dt>
                  <dd className="text-sm text-[#1A1A2E]">{fmtDate(job.created_at)}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
              <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">
                Description
              </h2>
              {job.notes ? (
                <p className="text-sm text-[#6B7280] leading-relaxed whitespace-pre-wrap">{job.notes}</p>
              ) : (
                <p className="text-sm text-gray-300 italic">No description added</p>
              )}
            </div>
          </div>

          {/* Job Cost Summary */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">
              Job Cost Summary
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Materials Cost</span>
                <span className="font-medium text-[#1A1A2E]">{fmtCurrency(materialsCost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Purchase Orders
                  <span className="text-xs text-[#6B7280] ml-1.5">(received only)</span>
                </span>
                <span className="font-medium text-[#1A1A2E]">{fmtCurrency(purchaseOrdersCost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Labour Cost
                  <span className="text-xs text-[#6B7280] ml-1.5">
                    ({job.staff?.pay_rate ? `${fmtCurrency(payRate)}/hr` : 'no rate set'} × 2 hrs est.)
                  </span>
                </span>
                <span className="font-medium text-[#1A1A2E]">{fmtCurrency(labourCost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-[#E5E7EB] pt-2.5 mt-1">
                <span className="font-semibold text-[#6B7280]">Total Cost</span>
                <span className="font-semibold text-[#1A1A2E]">{fmtCurrency(totalCost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Quote Total</span>
                <span className="font-medium text-[#1A1A2E]">
                  {quoteTotal !== null ? fmtCurrency(quoteTotal) : <span className="text-gray-300">No quote</span>}
                </span>
              </div>
              {margin !== null && (
                <div className="flex items-center justify-between text-sm border-t border-[#E5E7EB] pt-2.5 mt-1">
                  <span className="font-semibold text-[#6B7280]">Profit Margin</span>
                  <span
                    className="font-semibold text-base"
                    style={{ color: margin >= 0 ? '#C9A84C' : '#EF4444' }}
                  >
                    {margin >= 0 ? '+' : ''}{fmtCurrency(margin)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {activeTab === 'notes' && (
        <div className="tab-fade-in">
          {/* Add note form */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 mb-5">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note…"
              rows={3}
              className="w-full text-sm text-[#1A1A2E] placeholder-gray-300 resize-none border-0 outline-none focus:ring-0"
            />
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
              {noteError ? (
                <p className="text-xs text-[#EF4444]">{noteError}</p>
              ) : (
                <span />
              )}
              <Button onClick={handleAddNote} disabled={saving || !noteText.trim()} variant="primary" size="sm">
                {saving ? 'Saving…' : 'Add Note'}
              </Button>
            </div>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-10 text-center">
              <p className="text-sm text-[#6B7280]">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <div key={note.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
                  {editingId === note.id ? (
                    <>
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        rows={3}
                        className="w-full text-sm text-[#1A1A2E] resize-none border-0 outline-none focus:ring-0 mb-2"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                        <Button
                          onClick={cancelEdit}
                          disabled={updatingId === note.id}
                          variant="secondary"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={updatingId === note.id || !editText.trim()}
                          variant="primary"
                          size="sm"
                        >
                          {updatingId === note.id ? 'Saving…' : 'Save'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-[#6B7280] leading-relaxed whitespace-pre-wrap mb-2">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#6B7280]">{fmtDateTime(note.created_at)}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(note)}
                            className="text-xs text-[#6B7280] hover:text-[#1A1A2E] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            disabled={deletingId === note.id}
                            className="text-xs text-[#EF4444]/70 hover:text-[#EF4444] transition-colors disabled:opacity-50"
                          >
                            {deletingId === note.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photos */}
      {activeTab === 'photos' && (
        <div className="tab-fade-in">
          <JobPhotos jobId={job.id} initialPhotos={initialPhotos} />
        </div>
      )}

      {/* Materials */}
      {activeTab === 'materials' && (
        <div className="tab-fade-in">
          <MaterialsSection
            jobId={job.id}
            materials={materials}
            initialJobMaterials={initialJobMaterials}
          />
        </div>
      )}

      {/* Purchase Orders */}
      {activeTab === 'purchase_orders' && (
        <div className="tab-fade-in">
          <PurchaseOrdersSection
            jobId={job.id}
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={setPurchaseOrders}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Checklist */}
      {activeTab === 'checklist' && (
        <div className="tab-fade-in">
          <ChecklistSection
            jobId={job.id}
            templateId={checklistTemplateId}
            setTemplateId={setChecklistTemplateId}
            items={checklistItems}
            setItems={setChecklistItems}
            templates={checklistTemplates}
            isAdmin={isAdmin}
            currentUserDisplayName={currentUserDisplayName}
          />
        </div>
      )}

      {/* Activity */}
      {activeTab === 'activity' && (
        <div className="tab-fade-in">
          {timeline.length === 0 ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-10 text-center">
              <p className="text-sm text-[#6B7280]">No activity recorded</p>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-100" />
              <div className="space-y-6">
                {timeline.map((entry, i) => (
                  <div key={i} className="relative flex items-start gap-4">
                    <span
                      className="absolute -left-4 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white"
                      style={{ background: entry.dotColor }}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#1A1A2E]">{entry.label}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {new Date(entry.date).toLocaleDateString('en-NZ', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
