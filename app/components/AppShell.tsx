'use client'

import { useEffect, useState } from 'react'
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

const COLLAPSE_KEY = 'operify:sidebar-collapsed'

interface Props {
  role: string
  userName?: string | null
  userEmail?: string | null
  permissions?: PermissionMap | null
  demoMode?: boolean
  companyName?: string
  children: React.ReactNode
}

export default function AppShell({ role, userName, userEmail, permissions, demoMode, companyName, children }: Props) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // localStorage isn't available during SSR, so this can't be a lazy useState initializer
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true)
  }, [])

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <div className="h-full flex flex-col">
      {/* Mobile top bar */}
      <div className="md:hidden shrink-0 h-14 bg-sidebar flex items-center px-4 gap-4">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-11 h-11 -ml-2.5 text-white/60 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <HamburgerIcon />
        </button>
        <span className="text-[15px] font-bold tracking-[0.18em] text-white">
          RUNSITE
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
            'fixed inset-y-0 left-0 z-50 w-[260px]',
            'md:static md:z-auto md:translate-x-0',
            collapsed ? 'md:w-14' : 'md:w-[260px]',
            'transition-[width,transform] duration-200 ease-in-out',
            open ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          {/* Full sidebar — always shown on mobile (drawer); on desktop only when not collapsed */}
          <div className={collapsed ? 'md:hidden h-full' : 'h-full'}>
            <Sidebar
              role={role}
              userName={userName}
              userEmail={userEmail}
              permissions={permissions}
              demoMode={demoMode}
              companyName={companyName}
              onNavigate={() => setOpen(false)}
              onCollapse={() => setCollapsed(true)}
            />
          </div>

          {/* Collapsed rail — desktop only: icon-only nav with tooltips */}
          <div className={`hidden h-full ${collapsed ? 'md:block' : ''}`}>
            <Sidebar
              role={role}
              userName={userName}
              userEmail={userEmail}
              permissions={permissions}
              demoMode={demoMode}
              companyName={companyName}
              collapsed
              onExpand={() => setCollapsed(false)}
            />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto min-w-0 bg-page">
          {children}
        </main>
      </div>
    </div>
  )
}
