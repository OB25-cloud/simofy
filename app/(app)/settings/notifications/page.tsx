import { supabase } from '@/lib/supabase'
import GlobalNotificationDefaults from '@/app/components/settings/GlobalNotificationDefaults'

export const dynamic = 'force-dynamic'

export default async function NotificationSettingsPage() {
  const [{ data: defaults }, { count: clientCount }] = await Promise.all([
    supabase.from('notification_defaults').select('notification_type, enabled'),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
  ])

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#B8922A' }}>
          Settings
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">Notification Defaults</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set the default notification preferences for new clients. You can override these per client from their profile page.
        </p>
      </div>

      <GlobalNotificationDefaults
        initialDefaults={defaults ?? []}
        clientCount={clientCount ?? 0}
      />

      {/* Setup note */}
      <div
        className="mt-8 rounded-lg border p-4"
        style={{ borderColor: 'rgba(184,146,42,0.3)', background: 'rgba(184,146,42,0.04)' }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: '#B8922A' }}>Database setup required</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Run <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">supabase/create_notification_tables.sql</code> in your
          Supabase SQL editor to create the required tables before using notifications.
        </p>
      </div>
    </div>
  )
}
