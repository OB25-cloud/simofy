'use client'

import { useState } from 'react'
import type { Site } from '@/lib/types'
import AddSiteModal from './AddSiteModal'

function SiteCard({ site }: { site: Site }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-medium text-[#1A1A2E]">{site.address}</p>
        {site.location && (
          <p className="text-xs text-[#6B7280] mt-0.5">{site.location}</p>
        )}
      </div>

      {(site.access_notes || site.hazard_notes) && (
        <div className="space-y-2.5 pt-3 border-t border-gray-50">
          {site.access_notes && (
            <div className="flex gap-2">
              <span className="shrink-0 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-0.5">Access</p>
                <p className="text-xs text-[#6B7280] leading-relaxed">{site.access_notes}</p>
              </div>
            </div>
          )}
          {site.hazard_notes && (
            <div className="flex gap-2">
              <span className="shrink-0 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-0.5">Hazards</p>
                <p className="text-xs text-[#6B7280] leading-relaxed">{site.hazard_notes}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SitesSection({
  clientId,
  sites,
}: {
  clientId: string
  sites: Site[]
}) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#1A1A2E]">
          Sites
          <span className="ml-2 text-sm font-normal text-[#6B7280]">({sites.length})</span>
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-opacity hover:opacity-90"
          style={{ background: '#C9A84C' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Site
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-10 text-center">
          <p className="text-sm text-[#6B7280]">No sites added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}

      {showModal && (
        <AddSiteModal clientId={clientId} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
