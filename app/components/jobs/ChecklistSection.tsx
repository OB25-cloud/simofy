'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChecklistTemplate, ChecklistTemplateItem, JobChecklistItem } from '@/lib/types'

interface Props {
  jobId: string
  templateId: string | null
  setTemplateId: (id: string) => void
  items: JobChecklistItem[]
  setItems: React.Dispatch<React.SetStateAction<JobChecklistItem[]>>
  templates: Pick<ChecklistTemplate, 'id' | 'name'>[]
  isAdmin: boolean
  currentUserDisplayName: string
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ChecklistSection({
  jobId,
  templateId,
  setTemplateId,
  items,
  setItems,
  templates,
  isAdmin,
  currentUserDisplayName,
}: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState('')

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  async function handleAssign() {
    if (!selectedTemplate) return
    setAssigning(true)
    setAssignError('')

    const { data: templateItems, error: fetchErr } = await supabase
      .from('checklist_template_items')
      .select('*')
      .eq('template_id', selectedTemplate)
      .order('sort_order', { ascending: true })

    if (fetchErr) {
      setAssignError(fetchErr.message)
      setAssigning(false)
      return
    }

    const rows = ((templateItems ?? []) as ChecklistTemplateItem[]).map(ti => ({
      job_id: jobId,
      template_item_id: ti.id,
      item_text: ti.item_text,
      required: ti.required,
      sort_order: ti.sort_order,
    }))

    if (rows.length === 0) {
      setAssignError('That template has no items yet — add some under Settings → Checklists first.')
      setAssigning(false)
      return
    }

    const [{ data: inserted, error: insertErr }, { error: updateErr }] = await Promise.all([
      supabase.from('job_checklist_items').insert(rows).select(),
      supabase.from('jobs').update({ checklist_template_id: selectedTemplate }).eq('id', jobId),
    ])

    if (insertErr || updateErr) {
      setAssignError((insertErr ?? updateErr)?.message ?? 'Failed to assign checklist.')
      setAssigning(false)
      return
    }

    setItems((inserted ?? []) as JobChecklistItem[])
    setTemplateId(selectedTemplate)
    setAssigning(false)
  }

  async function handleToggle(item: JobChecklistItem) {
    setTogglingId(item.id)
    setToggleError('')
    const completed = !item.completed
    const completedBy = completed ? currentUserDisplayName : null
    const completedAt = completed ? new Date().toISOString() : null

    // Optimistic UI update
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, completed, completed_by: completedBy, completed_at: completedAt } : i)))

    // Full-row upsert (not a partial update) so this is safe even if the
    // row were ever missing — NOT NULL columns (job_id, item_text) must be
    // present in an upsert payload or Postgres rejects it outright.
    const payload = {
      id: item.id,
      job_id: item.job_id,
      template_item_id: item.template_item_id,
      item_text: item.item_text,
      required: item.required,
      sort_order: item.sort_order,
      completed,
      completed_by: completedBy,
      completed_at: completedAt,
    }
    console.log('[Checklist] upserting job_checklist_items:', payload)

    const { data, error } = await supabase
      .from('job_checklist_items')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error('[Checklist] upsert FAILED — code:', error.code, '| message:', error.message, '| details:', error.details, '| hint:', error.hint)
      setToggleError(`Failed to save "${item.item_text}" — ${error.message}`)
      // Roll back optimistic update
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
    } else {
      console.log('[Checklist] upsert SUCCESS:', data)
    }
    setTogglingId(null)
  }

  if (!templateId) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 py-10 text-center">
        <p className="text-sm text-gray-400 mb-4">No checklist assigned to this job yet</p>
        {isAdmin && (
          templates.length === 0 ? (
            <p className="text-xs text-gray-400">
              No checklist templates exist yet — create one under Settings → Checklists.
            </p>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:border-[#B8922A] text-gray-700"
              >
                <option value="">Select a checklist…</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!selectedTemplate || assigning}
                className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50"
                style={{ background: '#B8922A' }}
              >
                {assigning ? 'Assigning…' : 'Assign Checklist'}
              </button>
            </div>
          )
        )}
        {assignError && <p className="text-xs text-red-500 mt-3">{assignError}</p>}
      </div>
    )
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">
          {completedCount} of {totalCount} item{totalCount !== 1 ? 's' : ''} complete
        </p>
        <p className="text-xs font-semibold" style={{ color: '#B8922A' }}>{progressPct}%</p>
      </div>
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mb-5">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%`, background: '#B8922A' }}
        />
      </div>

      {toggleError && (
        <div className="mb-3 px-3 py-2 rounded-md text-xs" style={{ background: '#fef2f2', color: '#dc2626' }}>
          {toggleError}
        </div>
      )}

      {/* Items */}
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="flex items-start gap-3 px-4 py-3.5"
            style={{ borderTop: i > 0 ? '1px solid #f3f4f6' : undefined }}
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => handleToggle(item)}
              disabled={togglingId === item.id}
              className="mt-0.5 w-4 h-4 rounded cursor-pointer shrink-0"
              style={{ accentColor: '#B8922A' }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm"
                  style={{ color: item.completed ? '#9ca3af' : '#111827', textDecoration: item.completed ? 'line-through' : 'none' }}
                >
                  {item.item_text}
                </span>
                {item.required && (
                  <span
                    className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: 'rgba(184,146,42,0.1)', color: '#B8922A' }}
                  >
                    Required
                  </span>
                )}
              </div>
              {item.completed && item.completed_by && item.completed_at && (
                <p className="text-xs text-gray-400 mt-0.5">
                  ✓ {item.completed_by} · {fmtDateTime(item.completed_at)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
