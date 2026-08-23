import type { Notification } from '@/lib/types'

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

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  sent:     { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Sent'     },
  pending:  { bg: '#F4F5F7', text: '#6B7280', dot: '#E5E7EB', label: 'Pending'  },
  queued:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Queued'   },
  failed:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Failed'   },
  cancelled:{ bg: '#F9FAFB', text: '#1A1A2E', dot: '#6B7280', label: 'Cancelled'},
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? { bg: '#F4F5F7', text: '#6B7280', dot: '#E5E7EB', label: status }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

function fmtDateTime(s: string): string {
  return new Date(s).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function CommunicationsSection({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-10 text-center">
        <p className="text-sm text-[#6B7280]">No notifications sent to this client yet</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-[#6B7280] mb-4">
        {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
      </p>
      <div className="relative">
        {notifications.map((n, i) => (
          <div key={n.id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < notifications.length - 1 && (
              <span className="absolute left-[5px] top-3 bottom-0 w-px bg-gray-100" />
            )}
            <span
              className="mt-1.5 w-[11px] h-[11px] rounded-full shrink-0 z-10"
              style={{ background: (STATUS_CONFIG[n.status] ?? STATUS_CONFIG.pending).dot }}
            />
            <div className="min-w-0 flex-1 rounded-lg border border-[#E5E7EB] px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-sm font-semibold text-[#1A1A2E]">{typeLabel(n.type)}</p>
                <StatusBadge status={n.status} />
              </div>
              <p className="text-xs text-[#6B7280]">
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
