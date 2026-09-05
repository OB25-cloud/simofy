import type { Notification } from '@/lib/types'
import { StatusBadge, statusDot } from '@/app/components/ui/Badge'

const TYPE_LABELS: Record<string, string> = {
  job_confirmation:    'Job Confirmation',
  day_before_reminder: 'Day-Before Reminder',
  job_completion:      'Job Completion',
  completion:          'Job Completion',
  invoice_overdue:     'Invoice Overdue Reminder',
  review_request:      'Review Request',
}

function typeLabel(type: string): string {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type]
  return type.split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')
}

function fmtDateTime(s: string): string {
  return new Date(s).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function CommunicationsSection({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface-muted py-10 text-center">
        <p className="text-sm text-ink-muted">No notifications sent to this client yet</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-ink-muted mb-4">
        {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
      </p>
      <div className="relative">
        {notifications.map((n, i) => (
          <div key={n.id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < notifications.length - 1 && (
              <span className="absolute left-[5px] top-3 bottom-0 w-px bg-line" />
            )}
            <span
              className="mt-1.5 w-[11px] h-[11px] rounded-full shrink-0 z-10"
              style={{ background: statusDot(n.status) }}
            />
            <div className="min-w-0 flex-1 rounded-lg border border-line px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-sm font-semibold text-ink">{typeLabel(n.type)}</p>
                <StatusBadge status={n.status} />
              </div>
              <p className="text-xs text-ink-muted">
                {n.sent_at
                  ? `Sent ${fmtDateTime(n.sent_at)}`
                  : n.scheduled_for
                  ? `Scheduled for ${fmtDateTime(n.scheduled_for)}`
                  : `Created ${fmtDateTime(n.created_at)}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
