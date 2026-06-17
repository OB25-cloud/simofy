// Shared "which town is this job in" logic — used by the Schedule map
// (plotting pins) and Reports (revenue-by-location breakdown). Single
// source of truth for the three towns + their approximate centre
// coordinates so the two features can't drift apart.
export const TOWN_COORDS = [
  { name: 'Queenstown', lat: -45.0312, lng: 168.6626 },
  { name: 'Wanaka', lat: -44.7, lng: 169.15 },
  { name: 'Cromwell', lat: -45.05, lng: 169.2 },
]

export function matchTownName(text: string | null | undefined): string | null {
  if (!text) return null
  const lower = text.toLowerCase()
  return TOWN_COORDS.find(t => lower.includes(t.name.toLowerCase()))?.name ?? null
}
