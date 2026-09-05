'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Script from 'next/script'
import { TOWN_COORDS } from '@/lib/townMatch'
import { colorForStatus } from './scheduleColors'
import type { ScheduleJob } from './scheduleDates'

// Re-exported for callers that used to import the type from here.
export type { ScheduleJob }

// Leaflet + OpenStreetMap via CDN — free, no API key, unlike Mapbox GL JS
// which requires an access token even for the CDN build.
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

// ─── minimal ambient Leaflet typings (CDN global, no @types package) ────────

interface LeafletLatLngBounds {
  __brand: 'LeafletLatLngBounds'
}
interface LeafletCircleMarker {
  addTo: (target: LeafletLayerGroup) => LeafletCircleMarker
  bindPopup: (html: string) => LeafletCircleMarker
}
interface LeafletLayerGroup {
  addTo: (map: LeafletMap) => LeafletLayerGroup
  addLayer: (layer: LeafletCircleMarker) => LeafletLayerGroup
  clearLayers: () => LeafletLayerGroup
}
interface LeafletTileLayer {
  addTo: (map: LeafletMap) => LeafletTileLayer
}
interface LeafletFeatureGroup {
  getBounds: () => LeafletLatLngBounds
}
interface LeafletMap {
  setView: (center: [number, number], zoom: number) => LeafletMap
  remove: () => void
  fitBounds: (bounds: LeafletLatLngBounds, options?: { padding?: [number, number]; maxZoom?: number }) => LeafletMap
}
interface LeafletStatic {
  map: (el: HTMLElement) => LeafletMap
  tileLayer: (url: string, options: Record<string, unknown>) => LeafletTileLayer
  circleMarker: (latlng: [number, number], options: Record<string, unknown>) => LeafletCircleMarker
  layerGroup: () => LeafletLayerGroup
  featureGroup: (layers: LeafletCircleMarker[]) => LeafletFeatureGroup
}

declare global {
  interface Window {
    L?: LeafletStatic
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function matchTown(location: string | null) {
  if (!location) return null
  const lower = location.toLowerCase()
  return TOWN_COORDS.find(t => lower.includes(t.name.toLowerCase())) ?? null
}

function jobTown(job: ScheduleJob) {
  return matchTown(job.location) ?? matchTown(job.sites?.address ?? null)
}

// Stable per-job pseudo-random offset so jobs in the same town don't all
// stack on exactly one point — deterministic (seeded on job id) so pins
// don't jump around on re-render.
function jitter(seed: string): [number, number] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  const angle = ((Math.abs(hash) % 1000) / 1000) * Math.PI * 2
  const radius = ((Math.abs(hash >> 8) % 1000) / 1000) * 0.018
  return [Math.cos(angle) * radius, Math.sin(angle) * radius]
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── component ───────────────────────────────────────────────────────────────

export default function MapView({ jobs: allJobs }: { jobs: ScheduleJob[] }) {
  // Defensive: if Leaflet's script tag is already loaded (e.g. this
  // component remounted while the global <script> persisted in the
  // document — next/script's onLoad won't fire a second time for an
  // already-completed script load), pick that up immediately instead of
  // waiting forever for an onLoad that will never re-fire.
  const [leafletReady, setLeafletReady] = useState(() => typeof window !== 'undefined' && !!window.L)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerGroupRef = useRef<LeafletLayerGroup | null>(null)

  // Client-side filters over whatever range of jobs is currently loaded
  // (the Day/Week toggle above still controls what that range actually is).
  const [dateFilter, setDateFilter] = useState('all')
  const [staffFilter, setStaffFilter] = useState('all')

  const dateOptions = [...new Set(allJobs.map(j => j.scheduled_date?.split('T')[0]).filter((d): d is string => !!d))].sort()
  const staffOptions = [...new Map(allJobs.filter(j => j.staff_id && j.staff?.name).map(j => [j.staff_id as string, j.staff!.name])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))

  const jobs = useMemo(() => allJobs.filter(j => {
    if (dateFilter !== 'all' && j.scheduled_date?.split('T')[0] !== dateFilter) return false
    if (staffFilter === 'unassigned' && j.staff_id) return false
    if (staffFilter !== 'all' && staffFilter !== 'unassigned' && j.staff_id !== staffFilter) return false
    return true
  }), [allJobs, dateFilter, staffFilter])

  // Create the map once Leaflet has loaded
  useEffect(() => {
    if (!leafletReady || mapRef.current || !containerRef.current) return
    const L = window.L
    if (!L) return

    const map = L.map(containerRef.current).setView([-44.93, 168.97], 9)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map
    layerGroupRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      layerGroupRef.current = null
    }
  }, [leafletReady])

  // Sync markers whenever the job list (or map readiness) changes
  useEffect(() => {
    const map = mapRef.current
    const layerGroup = layerGroupRef.current
    const L = window.L
    if (!map || !layerGroup || !L) return

    layerGroup.clearLayers()

    const markers: LeafletCircleMarker[] = []
    for (const job of jobs) {
      const town = jobTown(job)
      if (!town) continue

      const [dx, dy] = jitter(job.id)
      const color = colorForStatus(job.status).solid
      const dateLabel = job.scheduled_date
        ? new Date(job.scheduled_date).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
        : '—'

      const popupHtml = `
        <div style="font-family:inherit;min-width:170px;">
          <p style="font-weight:600;font-size:13px;color:var(--ink);margin:0 0 4px;">${escapeHtml(job.title ?? job.job_type ?? 'Untitled')}</p>
          <p style="font-size:12px;color:var(--ink-muted);margin:0 0 2px;">${escapeHtml(job.clients?.name ?? 'No client')}</p>
          <p style="font-size:12px;color:var(--ink-muted);margin:0 0 2px;">${escapeHtml(job.staff?.name ?? 'Unassigned')}</p>
          <p style="font-size:11px;color:var(--ink-muted);margin:0 0 8px;">${escapeHtml(dateLabel)}</p>
          <a href="/jobs/${job.id}" style="font-size:12px;font-weight:600;color:var(--accent);text-decoration:none;">View Job →</a>
        </div>
      `.trim()

      const marker = L.circleMarker([town.lat + dy, town.lng + dx], {
        radius: 9,
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      }).bindPopup(popupHtml)

      layerGroup.addLayer(marker)
      markers.push(marker)
    }

    if (markers.length > 0) {
      map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40], maxZoom: 13 })
    }
  }, [jobs, leafletReady])

  const unlocatedCount = jobs.filter(j => !jobTown(j)).length
  const selectClass = 'border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent'

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      <link rel="stylesheet" href={LEAFLET_CSS} />
      <Script src={LEAFLET_JS} strategy="afterInteractive" onLoad={() => setLeafletReady(true)} />

      <div className="shrink-0 flex items-center gap-2 mb-3">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Filter</label>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className={selectClass}>
          <option value="all">All dates</option>
          {dateOptions.map(d => (
            <option key={d} value={d}>
              {new Date(`${d}T00:00:00`).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })}
            </option>
          ))}
        </select>
        <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className={selectClass}>
          <option value="all">All staff</option>
          <option value="unassigned">Unassigned</option>
          {staffOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 rounded-xl border border-line shadow-sm overflow-hidden bg-surface-muted"
      >
        {!leafletReady && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-ink-muted">Loading map…</p>
          </div>
        )}
      </div>
      {unlocatedCount > 0 && (
        <p className="shrink-0 mt-3 text-xs text-ink-muted">
          {unlocatedCount} job{unlocatedCount !== 1 ? 's' : ''} not shown — location doesn&apos;t mention Queenstown, Wanaka or Cromwell.
        </p>
      )}
    </div>
  )
}
