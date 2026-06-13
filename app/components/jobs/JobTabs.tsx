'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Job, JobPhoto, JobNote } from '@/lib/types'
import JobPhotos from './JobPhotos'

const RECURRENCE_LABELS: Record<string, string> = {
  weekly:      'Weekly',
  fortnightly: 'Fortnightly',
  monthly:     'Monthly',
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending'     },
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled'   },
  in_progress: { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'In Progress' },
  complete:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Complete'     },
  invoiced:    { bg: '#faf5ff', text: '#7c3aed', dot: '#8b5cf6', label: 'Invoiced'    },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled'   },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const c = STATUS_CONFIG[status] ?? { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: status }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
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

const TABS = [
  { key: 'overview',  label: 'Overview'  },
  { key: 'notes',     label: 'Notes'     },
  { key: 'photos',    label: 'Photos'    },
  { key: 'activity',  label: 'Activity'  },
]

interface Props {
  job: Job
  initialPhotos: JobPhoto[]
  initialNotes: JobNote[]
}

export default function JobTabs({ job, initialPhotos, initialNotes }: Props) {
  const [activeTab, setActiveTab] = useState('overview')
  const [notes, setNotes] = useState<JobNote[]>(initialNotes)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    timeline.push({ label: 'Job Created', date: job.created_at, dotColor: '#9ca3af' })
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
        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-lg border border-gray-100 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Job Details
            </h2>
            <dl className="space-y-3.5">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Status</dt>
                <dd><StatusBadge status={job.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Job Type</dt>
                <dd className="text-sm text-gray-900">
                  {job.job_type ?? <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Recurrence</dt>
                <dd className="text-sm text-gray-900">
                  {job.recurrence_pattern
                    ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: '#fdf8ee', color: '#B8922A' }}
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
                <dd className="text-sm text-gray-900">{fmtDate(job.scheduled_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Created</dt>
                <dd className="text-sm text-gray-900">{fmtDate(job.created_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-gray-100 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Description
            </h2>
            {job.notes ? (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.notes}</p>
            ) : (
              <p className="text-sm text-gray-300 italic">No description added</p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {activeTab === 'notes' && (
        <div>
          {/* Add note form */}
          <div className="rounded-lg border border-gray-100 p-4 mb-5">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note…"
              rows={3}
              className="w-full text-sm text-gray-900 placeholder-gray-300 resize-none border-0 outline-none focus:ring-0"
            />
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {noteError ? (
                <p className="text-xs text-red-500">{noteError}</p>
              ) : (
                <span />
              )}
              <button
                onClick={handleAddNote}
                disabled={saving || !noteText.trim()}
                className="px-3 py-1.5 text-xs font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#B8922A' }}
              >
                {saving ? 'Saving…' : 'Add Note'}
              </button>
            </div>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 py-10 text-center">
              <p className="text-sm text-gray-400">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <div key={note.id} className="rounded-lg border border-gray-100 p-4">
                  {editingId === note.id ? (
                    /* Edit mode */
                    <>
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        rows={3}
                        className="w-full text-sm text-gray-900 resize-none border-0 outline-none focus:ring-0 mb-2"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={cancelEdit}
                          disabled={updatingId === note.id}
                          className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={updatingId === note.id || !editText.trim()}
                          className="px-3 py-1.5 text-xs font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: '#B8922A' }}
                        >
                          {updatingId === note.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* View mode */
                    <>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">{fmtDateTime(note.created_at)}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(note)}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            disabled={deletingId === note.id}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
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
        <JobPhotos jobId={job.id} initialPhotos={initialPhotos} />
      )}

      {/* Activity */}
      {activeTab === 'activity' && (
        <div>
          {timeline.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 py-10 text-center">
              <p className="text-sm text-gray-400">No activity recorded</p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-100" />

              <div className="space-y-6">
                {timeline.map((entry, i) => (
                  <div key={i} className="relative flex items-start gap-4">
                    {/* Dot */}
                    <span
                      className="absolute -left-4 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white"
                      style={{ background: entry.dotColor }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
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
