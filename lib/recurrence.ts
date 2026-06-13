export type RecurringTemplate = {
  title: string | null
  job_type: string | null
  client_id: string | null
  site_id: string | null
  staff_id: string | null
  location: string | null
  notes: string | null
}

export function computeNextDate(dateStr: string, pattern: string): string {
  const d = new Date(dateStr)
  if (pattern === 'weekly')           d.setDate(d.getDate() + 7)
  else if (pattern === 'fortnightly') d.setDate(d.getDate() + 14)
  else if (pattern === 'monthly')     d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export function buildOccurrences(
  fromDate: string,
  pattern: string,
  count: number,
  seriesId: string,
  template: RecurringTemplate,
): object[] {
  const rows: object[] = []
  let date = fromDate
  for (let i = 0; i < count; i++) {
    date = computeNextDate(date, pattern)
    rows.push({
      ...template,
      scheduled_date: date,
      status: 'scheduled',
      is_recurring: true,
      recurrence_pattern: pattern,
      recurring_series_id: seriesId,
    })
  }
  return rows
}
