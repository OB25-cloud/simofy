'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import type { PermissionMap } from '@/lib/permissions'

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

interface Props {
  role: string
  userName?: string | null
  userEmail?: string | null
  permissions?: PermissionMap | null
  children: React.ReactNode
}

export default function AppShell({ role, userName, userEmail, permissions, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="h-full flex flex-col">
      {/* Mobile top bar */}
      <div className="md:hidden shrink-0 h-14 bg-black flex items-center px-4 gap-4">
        <button
          onClick={() => setOpen(true)}
          className="p-1 text-white/60 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <HamburgerIcon />
        </button>
        <span className="text-lg font-bold tracking-[0.25em]" style={{ color: '#B8922A' }}>
          SIMOFY
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Backdrop */}
        {open && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Sidebar — static on desktop, fixed overlay on mobile */}
        <div
          className={[
            'fixed inset-y-0 left-0 z-50',
            'md:static md:z-auto md:translate-x-0',
            'transition-transform duration-200 ease-in-out',
            open ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <Sidebar
            role={role}
            userName={userName}
            userEmail={userEmail}
            permissions={permissions}
            onNavigate={() => setOpen(false)}
          />
        </div>

        <main className="flex-1 overflow-y-auto min-w-0" style={{ background: '#fafafa' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
