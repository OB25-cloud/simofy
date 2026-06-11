export const NOTIFICATION_TYPES = [
  {
    key: 'job_confirmation',
    label: 'Job Confirmation',
    description: 'Sent when a job is confirmed and scheduled',
  },
  {
    key: 'day_before_reminder',
    label: 'Day-Before Reminder',
    description: 'Sent the day before a scheduled job',
  },
  {
    key: 'job_completion',
    label: 'Job Completion',
    description: 'Sent when a job is marked complete',
  },
  {
    key: 'invoice_overdue',
    label: 'Invoice Overdue Reminder',
    description: 'Sent when an invoice becomes overdue',
  },
  {
    key: 'review_request',
    label: 'Review Request',
    description: 'Sent after job completion to request a review',
  },
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]['key']
