import { supabase } from '@/lib/supabase'
import GlobalNotificationDefaults from '@/app/components/settings/GlobalNotificationDefaults'

export const dynamic = 'force-dynamic'

export default async function NotificationSettingsPage() {
  const [{ data: defaults }, { count: clientCount }] = await Promise.all([
    supabase.from('notification_defaults').select('notification_type, enabled, review_request_delay_hours'),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
  ])

  const reviewRequestRow = defaults?.find((d: { notification_type: string }) => d.notification_type === 'review_request')
  const reviewRequestDelayHours: number = (reviewRequestRow as any)?.review_request_delay_hours ?? 24

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
        initialReviewDelayHours={reviewRequestDelayHours}
      />
    </div>
  )
}
