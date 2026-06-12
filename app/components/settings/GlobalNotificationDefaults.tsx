'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { NOTIFICATION_TYPES } from '@/lib/notificationTypes'

interface DefaultSetting {
  notification_type: string
  enabled: boolean
}

interface Props {
  initialDefaults: DefaultSetting[]
  clientCount: number
  initialReviewDelayHours: number
}

export default function GlobalNotificationDefaults({ initialDefaults, clientCount, initialReviewDelayHours }: Props) {
  const initial = Object.fromEntries(
    NOTIFICATION_TYPES.map(t => [
      t.key,
      initialDefaults.find(d => d.notification_type === t.key)?.enabled ?? true,
    ])
  )
  const [defaults, setDefaults] = useState<Record<string, boolean>>(initial)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [applyDone, setApplyDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewDelayHours, setReviewDelayHours] = useState(initialReviewDelayHours)
  const [savingDelay, setSavingDelay] = useState(false)

  async function toggleDefault(type: string) {
    const newValue = !defaults[type]
    setDefaults(prev => ({ ...prev, [type]: newValue }))
    setSaving(prev => new Set(prev).add(type))
    setError(null)

    const { error: dbErr } = await supabase
      .from('notification_defaults')
      .upsert(
        { notification_type: type, enabled: newValue, updated_at: new Date().toISOString() },
        { onConflict: 'notification_type' }
      )

    setSaving(prev => {
      const next = new Set(prev)
      next.delete(type)
      return next
    })

    if (dbErr) {
      setDefaults(prev => ({ ...prev, [type]: !newValue }))
      setError('Failed to save default. Make sure the notification_defaults table exists in Supabase.')
    }
  }

  async function saveReviewDelay(raw: number) {
    const hours = Math.max(1, Math.min(168, Math.round(raw)))
    setReviewDelayHours(hours)
    setSavingDelay(true)
    setError(null)

    const { error: dbErr } = await supabase
      .from('notification_defaults')
      .upsert(
        { notification_type: 'review_request', review_request_delay_hours: hours, updated_at: new Date().toISOString() },
        { onConflict: 'notification_type' }
      )

    setSavingDelay(false)
    if (dbErr) setError('Failed to save delay setting.')
  }

  async function applyToAllClients() {
    setApplying(true)
    setApplyDone(false)
    setError(null)

    // Fetch all client IDs
    const { data: clients, error: clientErr } = await supabase
      .from('clients')
      .select('id')

    if (clientErr || !clients) {
      setError('Failed to fetch clients.')
      setApplying(false)
      return
    }

    // Build upsert rows for every client × every type
    const rows = clients.flatMap(c =>
      NOTIFICATION_TYPES.map(t => ({
        client_id: c.id,
        notification_type: t.key,
        enabled: defaults[t.key] ?? true,
        updated_at: new Date().toISOString(),
      }))
    )

    // Upsert in batches of 100 to avoid request size limits
    for (let i = 0; i < rows.length; i += 100) {
      const { error: upsertErr } = await supabase
        .from('client_notification_settings')
        .upsert(rows.slice(i, i + 100), { onConflict: 'client_id,notification_type' })

      if (upsertErr) {
        setError(`Failed to apply defaults: ${upsertErr.message}`)
        setApplying(false)
        return
      }
    }

    setApplying(false)
    setApplyDone(true)
    setTimeout(() => setApplyDone(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Defaults toggles */}
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        {NOTIFICATION_TYPES.map((type, i) => {
          const enabled = defaults[type.key]
          const isSaving = saving.has(type.key)
          return (
            <div
              key={type.key}
              className="flex items-center justify-between px-5 py-4"
              style={{ borderTop: i > 0 ? '1px solid #f3f4f6' : undefined }}
            >
              <div className="min-w-0 flex-1 pr-6">
                <p className="text-sm font-medium text-gray-900">{type.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{type.description}</p>
                {type.key === 'review_request' && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">Send after</span>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={reviewDelayHours}
                      onChange={e => setReviewDelayHours(Number(e.target.value))}
                      onBlur={e => saveReviewDelay(Number(e.target.value))}
                      disabled={savingDelay}
                      className="w-16 border border-gray-200 rounded px-2 py-0.5 text-xs text-gray-900 focus:outline-none focus:border-[#B8922A] disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-400">hours after job completion</span>
                  </div>
                )}
              </div>
              <button
                role="switch"
                aria-checked={enabled}
                aria-label={`Toggle default for ${type.label}`}
                onClick={() => toggleDefault(type.key)}
                disabled={isSaving}
                className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 focus:outline-none"
                style={{ background: enabled ? '#B8922A' : '#e5e7eb' }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{ transform: enabled ? 'translateX(22px)' : 'translateX(4px)' }}
                />
              </button>
            </div>
          )
        })}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Apply to all clients */}
      <div className="rounded-lg border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Apply defaults to all existing clients</p>
            <p className="text-xs text-gray-400 mt-1">
              Overwrites all {clientCount} client{clientCount !== 1 ? 's' : ''}&apos; notification preferences with the defaults above.
            </p>
          </div>
          <button
            onClick={applyToAllClients}
            disabled={applying}
            className="shrink-0 px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#111111' }}
          >
            {applying ? 'Applying…' : applyDone ? '✓ Applied' : 'Apply to All'}
          </button>
        </div>
      </div>
    </div>
  )
}
