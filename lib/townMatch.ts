// Shared "which town is this job in" logic — used by the Schedule map
// (plotting pins) and Reports (revenue-by-location breakdown). Single
// source of truth for the towns + their approximate centre coordinates so
// the two features can't drift apart.
//
// Covers every town actually present in site addresses across both demo
// datasets that have been seeded into this DB: the original Central Otago
// set (Queenstown/Arrowtown/Wanaka/Cromwell) and the current Green & Co
// Landscaping (Wellington) set — Wellington/Lower Hutt/Porirua were missing
// here entirely, which is why every Green & Co job fell through to "Other"
// in Reports (and silently vanished from the Schedule map).
export const TOWN_COORDS = [
  { name: 'Queenstown', lat: -45.0312, lng: 168.6626 },
  { name: 'Arrowtown', lat: -44.9378, lng: 168.8352 },
  { name: 'Wanaka', lat: -44.7, lng: 169.15 },
  { name: 'Cromwell', lat: -45.05, lng: 169.2 },
  { name: 'Wellington', lat: -41.2865, lng: 174.7762 },
  { name: 'Lower Hutt', lat: -41.2118, lng: 174.9037 },
  { name: 'Porirua', lat: -41.1333, lng: 174.85 },
]

export function matchTownName(text: string | null | undefined): string | null {
  if (!text) return null
  const lower = text.toLowerCase()
  return TOWN_COORDS.find(t => lower.includes(t.name.toLowerCase()))?.name ?? null
}
