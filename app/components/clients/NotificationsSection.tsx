'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { NOTIFICATION_TYPES } from '@/lib/notificationTypes'

interface Setting {
  notification_type: string
  enabled: boolean
}

interface Props {
  clientId: string
  initialSettings: Setting[]
}

export default function NotificationsSection({ clientId, initialSettings }: Props) {
  // Build map: type → enabled; default true for any type not yet in DB
  const initial = Object.fromEntries(
    NOTIFICATION_TYPES.map(t => [
      t.key,
      initialSettings.find(s => s.notification_type === t.key)?.enabled ?? true,
    ])
  )
  const [settings, setSettings] = useState<Record<string, boolean>>(initial)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function toggle(type: string) {
    const newValue = !settings[type]
    setSettings(prev => ({ ...prev, [type]: newValue }))
    setSaving(prev => new Set(prev).add(type))
    setError(null)

    const { error: dbErr } = await supabase
      .from('client_notification_settings')
      .upsert(
        {
          client_id: clientId,
          notification_type: type,
          enabled: newValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,notification_type' }
      )

    setSaving(prev => {
      const next = new Set(prev)
      next.delete(type)
      return next
    })

    if (dbErr) {
      // Roll back optimistic update
      setSettings(prev => ({ ...prev, [type]: !newValue }))
      setError('Failed to save. Make sure the notifications table has been created in Supabase.')
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Notification Preferences</h2>
        <span className="text-xs text-gray-400">Per-client overrides</span>
      </div>

      <div className="rounded-lg border border-gray-100 overflow-hidden">
        {NOTIFICATION_TYPES.map((type, i) => {
          const enabled = settings[type.key]
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
              </div>
              <button
                role="switch"
                aria-checked={enabled}
                aria-label={`Toggle ${type.label}`}
                onClick={() => toggle(type.key)}
                disabled={isSaving}
                className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  background: enabled ? '#B8922A' : '#e5e7eb',
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  '--tw-ring-color': '#B8922A',
                } as any}
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

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
