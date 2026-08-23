export const DEFAULT_START_TIME = '08:00'
export const DEFAULT_END_TIME = '10:00'

// 30-minute increments, 6:00am to 7:00pm
export const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = []
  for (let mins = 6 * 60; mins <= 19 * 60; mins += 30) {
    const h24 = Math.floor(mins / 60)
    const m = mins % 60
    const value = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12
    const ampm = h24 < 12 ? 'AM' : 'PM'
    const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`
    options.push({ value, label })
  }
  return options
})()

export function formatTime(t: string | null | undefined): string | null {
  if (!t) return null
  const [h, m] = t.split(':')
  const d = new Date(2000, 0, 1, Number(h), Number(m))
  return d.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export const DAY_START_MIN = 6 * 60
export const DAY_END_MIN = 19 * 60
export const SLOT_MINUTES = 30

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
