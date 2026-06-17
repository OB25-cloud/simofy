import type { Quote } from './types'

export const FOLLOW_UP_THRESHOLD_DAYS = 7

/** Days since the most recent contact (a follow-up resets the clock). */
export function daysSinceLastContact(quote: Pick<Quote, 'sent_at' | 'last_followed_up_at'>): number | null {
  const reference = quote.last_followed_up_at ?? quote.sent_at
  if (!reference) return null
  return Math.floor((Date.now() - new Date(reference).getTime()) / 86_400_000)
}

export function isOverdueForFollowUp(quote: Pick<Quote, 'status' | 'sent_at' | 'last_followed_up_at'>): boolean {
  if (quote.status !== 'sent') return false
  const days = daysSinceLastContact(quote)
  return days != null && days > FOLLOW_UP_THRESHOLD_DAYS
}
