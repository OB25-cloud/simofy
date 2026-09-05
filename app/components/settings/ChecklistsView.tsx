'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChecklistTemplate, ChecklistTemplateItem } from '@/lib/types'

type TemplateWithItems = ChecklistTemplate & { items: ChecklistTemplateItem[] }

export default function ChecklistsView({ initialTemplates }: { initialTemplates: TemplateWithItems[] }) {
  const [templates, setTemplates] = useState<TemplateWithItems[]>(initialTemplates)
  const [selectedId, setSelectedId] = useState<string | null>(initialTemplates[0]?.id ?? null)

  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newError, setNewError] = useState('')

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [newItemText, setNewItemText] = useState('')
  const [newItemRequired, setNewItemRequired] = useState(false)
  const [addingItem, setAddingItem] = useState(false)

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemText, setEditItemText] = useState('')
  const [editItemRequired, setEditItemRequired] = useState(false)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState(false)

  const selected = templates.find(t => t.id === selectedId) ?? null

  function selectTemplate(t: TemplateWithItems) {
    setSelectedId(t.id)
    setEditingName(false)
    setEditingItemId(null)
    setConfirmDeleteTemplate(false)
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setNewError('')
    const { data, error } = await supabase
      .from('checklist_templates')
      .insert({ name })
      .select()
      .single()
    if (error) {
      setNewError(error.message)
      setCreating(false)
      return
    }
    const created: TemplateWithItems = { ...data, items: [] }
    setTemplates(prev => [...prev, created])
    setSelectedId(created.id)
    setNewName('')
    setShowNew(false)
    setCreating(false)
  }

  function startEditName() {
    if (!selected) return
    setNameValue(selected.name)
    setEditingName(true)
  }

  async function handleSaveName() {
    if (!selected) return
    const name = nameValue.trim()
    if (!name) return
    setSavingName(true)
    const { error } = await supabase.from('checklist_templates').update({ name }).eq('id', selected.id)
    if (!error) {
      setTemplates(prev => prev.map(t => (t.id === selected.id ? { ...t, name } : t)))
      setEditingName(false)
    }
    setSavingName(false)
  }

  async function handleDeleteTemplate() {
    if (!selected) return
    setDeletingTemplate(true)
    const { error } = await supabase.from('checklist_templates').delete().eq('id', selected.id)
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== selected.id))
      setSelectedId(prev => (prev === selected.id ? null : prev))
      setConfirmDeleteTemplate(false)
    }
    setDeletingTemplate(false)
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    const text = newItemText.trim()
    if (!text) return
    setAddingItem(true)
    const sortOrder = selected.items.length > 0 ? Math.max(...selected.items.map(i => i.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('checklist_template_items')
      .insert({ template_id: selected.id, item_text: text, required: newItemRequired, sort_order: sortOrder })
      .select()
      .single()
    if (!error && data) {
      setTemplates(prev => prev.map(t => (t.id === selected.id ? { ...t, items: [...t.items, data] } : t)))
      setNewItemText('')
      setNewItemRequired(false)
    }
    setAddingItem(false)
  }

  function startEditItem(item: ChecklistTemplateItem) {
    setEditingItemId(item.id)
    setEditItemText(item.item_text)
    setEditItemRequired(item.required)
  }

  async function handleSaveItem(itemId: string) {
    if (!selected) return
    const text = editItemText.trim()
    if (!text) return
    setSavingItemId(itemId)
    const { error } = await supabase
      .from('checklist_template_items')
      .update({ item_text: text, required: editItemRequired })
      .eq('id', itemId)
    if (!error) {
      setTemplates(prev => prev.map(t =>
        t.id === selected.id
          ? { ...t, items: t.items.map(i => (i.id === itemId ? { ...i, item_text: text, required: editItemRequired } : i)) }
          : t
      ))
      setEditingItemId(null)
    }
    setSavingItemId(null)
  }

  async function handleDeleteItem(itemId: string) {
    if (!selected) return
    setDeletingItemId(itemId)
    const { error } = await supabase.from('checklist_template_items').delete().eq('id', itemId)
    if (!error) {
      setTemplates(prev => prev.map(t =>
        t.id === selected.id ? { ...t, items: t.items.filter(i => i.id !== itemId) } : t
      ))
    }
    setDeletingItemId(null)
  }

  return (
    <div className="flex h-full">
      {/* New template modal */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false) }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-ink">New Checklist Template</h2>
              <button onClick={() => setShowNew(false)} className="text-ink-muted hover:text-ink text-xl leading-none p-3.5 -m-3.5 md:p-0 md:m-0" aria-label="Close">×</button>
            </div>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Standard Lawn Mow"
                  className="w-full px-3 py-2 rounded-md border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent"
                />
              </div>
              {newError && (
                <div className="px-3 py-2 rounded-md text-sm bg-red-50 text-[#EF4444]">{newError}</div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-3 sm:py-2 text-sm text-ink-muted hover:text-ink">Cancel</button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-3 sm:py-2 text-sm font-medium text-white font-semibold rounded-md disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {creating ? 'Creating…' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete template confirmation */}
      {confirmDeleteTemplate && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDeleteTemplate(false) }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-ink mb-2">Delete template?</h2>
            <p className="text-sm text-ink-muted mb-1">
              Are you sure you want to delete <span className="font-medium text-ink-muted">{selected.name}</span>?
            </p>
            <p className="text-sm text-[#EF4444] mb-6">
              This deletes all {selected.items.length} item{selected.items.length !== 1 ? 's' : ''}. Jobs that already have this checklist assigned keep their checked-off progress.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteTemplate(false)} className="px-4 py-3 sm:py-2 text-sm text-ink-muted hover:text-ink">Cancel</button>
              <button
                onClick={handleDeleteTemplate}
                disabled={deletingTemplate}
                className="px-4 py-3 sm:py-2 text-sm font-medium text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-md transition-colors disabled:opacity-50"
              >
                {deletingTemplate ? 'Deleting…' : 'Delete Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template list — hidden on mobile once a template is selected, so the
          detail panel gets the full screen instead of being squeezed beside a
          fixed-width list */}
      <div className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0 border-r border-line flex-col`}>
        <div className="px-4 py-3 border-b border-line shrink-0">
          <button
            onClick={() => setShowNew(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-3 sm:py-2 text-sm font-medium text-white font-semibold rounded-md"
            style={{ background: 'var(--accent)' }}
          >
            <span className="text-base leading-none font-bold">+</span>
            New Template
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-300">No templates yet</p>
            </div>
          ) : (
            templates.map(t => {
              const isSelected = t.id === selectedId
              return (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-line-soft"
                  style={{
                    background: isSelected ? 'rgba(21, 128, 61,0.04)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{t.name}</p>
                    <p className="text-xs text-ink-muted truncate">{t.items.length} item{t.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div className="flex-1 overflow-y-auto p-6">
          <button
            onClick={() => setSelectedId(null)}
            className="md:hidden -ml-2 mb-4 flex items-center gap-1.5 px-2 py-3 text-sm font-medium text-gray-500 hover:text-ink"
          >
            ← Back to templates
          </button>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  autoFocus
                  className="text-xl font-semibold text-ink px-2 py-1 rounded-md border border-line focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent flex-1"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !nameValue.trim()}
                  className="px-3 py-3 sm:py-1.5 text-sm font-medium text-white font-semibold rounded-md disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingName(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-ink-muted">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-ink">{selected.name}</h2>
                <button onClick={startEditName} className="text-xs text-ink-muted hover:text-ink transition-colors">Rename</button>
              </div>
            )}
            {!editingName && (
              <button
                onClick={() => setConfirmDeleteTemplate(true)}
                className="text-sm font-medium text-[#EF4444] hover:text-red-700 shrink-0"
              >
                Delete Template
              </button>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden mb-5">
            {selected.items.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-300">No items yet — add the first checklist item below</p>
              </div>
            ) : (
              selected.items.map((item, i) => (
                <div key={item.id} className={`px-5 py-3.5 ${i > 0 ? 'border-t border-line-soft' : ''}`}>
                  {editingItemId === item.id ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={editItemText}
                        onChange={e => setEditItemText(e.target.value)}
                        autoFocus
                        className="flex-1 px-2 py-1.5 rounded-md border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                        <input
                          type="checkbox"
                          checked={editItemRequired}
                          onChange={e => setEditItemRequired(e.target.checked)}
                          className="w-3.5 h-3.5"
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        Required
                      </label>
                      <button
                        onClick={() => handleSaveItem(item.id)}
                        disabled={savingItemId === item.id || !editItemText.trim()}
                        className="px-3 py-1.5 text-xs font-medium text-white font-semibold rounded-md disabled:opacity-50 shrink-0"
                        style={{ background: 'var(--accent)' }}
                      >
                        {savingItemId === item.id ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditingItemId(null)} className="text-xs text-gray-500 hover:text-ink-muted shrink-0">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-ink truncate">{item.item_text}</span>
                        {item.required && (
                          <span
                            className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                            style={{ background: 'rgba(21, 128, 61,0.1)', color: 'var(--accent)' }}
                          >
                            Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => startEditItem(item)} className="text-xs text-ink-muted hover:text-ink transition-colors">Edit</button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deletingItemId === item.id}
                          className="text-xs text-[#EF4444]/70 hover:text-[#EF4444] transition-colors disabled:opacity-50"
                        >
                          {deletingItemId === item.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add item form */}
          <form onSubmit={handleAddItem} className="bg-white rounded-xl border border-line shadow-sm p-4 flex items-center gap-3">
            <input
              type="text"
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              placeholder="Add a checklist item…"
              className="flex-1 px-3 py-2 rounded-md border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
              <input
                type="checkbox"
                checked={newItemRequired}
                onChange={e => setNewItemRequired(e.target.checked)}
                className="w-3.5 h-3.5"
                style={{ accentColor: 'var(--accent)' }}
              />
              Required
            </label>
            <button
              type="submit"
              disabled={addingItem || !newItemText.trim()}
              className="px-4 py-3 sm:py-2 text-sm font-medium text-white font-semibold rounded-md disabled:opacity-50 shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              {addingItem ? 'Adding…' : 'Add Item'}
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-300">Select a template, or create a new one</p>
        </div>
      )}
    </div>
  )
}
