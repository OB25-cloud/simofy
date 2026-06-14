'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import GlobalSearch from './GlobalSearch'
import type { PermissionMap, Module } from '@/lib/permissions'

// ─── icons ──────────────────────────────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function ClientsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function JobsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}
function ScheduleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function QuotesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}
function InvoicesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
function StaffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function LeadsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
function MyJobsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

// ─── nav config ─────────────────────────────────────────────────────────────

type NavItem = { name: string; href: string; Icon: () => React.ReactElement }
type Section = { label: string; items: NavItem[] }

const ADMIN_SECTIONS: Section[] = [
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Dashboard', href: '/dashboard', Icon: DashboardIcon },
      { name: 'Jobs',      href: '/jobs',      Icon: JobsIcon      },
      { name: 'Schedule',  href: '/schedule',  Icon: ScheduleIcon  },
      { name: 'Staff',     href: '/staff',     Icon: StaffIcon     },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { name: 'Quotes',   href: '/quotes',   Icon: QuotesIcon   },
      { name: 'Invoices', href: '/invoices', Icon: InvoicesIcon },
    ],
  },
  {
    label: 'CLIENTS',
    items: [
      { name: 'Clients', href: '/clients', Icon: ClientsIcon },
      { name: 'Leads',   href: '/leads',   Icon: LeadsIcon   },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { name: 'Notifications', href: '/settings/notifications', Icon: BellIcon   },
      { name: 'Users',         href: '/settings/users',         Icon: UsersIcon  },
    ],
  },
]

function can(permissions: PermissionMap | null | undefined, module: Module): boolean {
  if (!permissions) return false
  return permissions[module]?.view ?? false
}

function buildDynamicSections(role: string, permissions: PermissionMap | null): Section[] {
  const isField = role === 'field'
  const sections: Section[] = []

  const opItems: NavItem[] = [
    can(permissions, 'dashboard') ? { name: 'Dashboard', href: '/dashboard',                       Icon: DashboardIcon } : null,
    can(permissions, 'jobs')      ? { name: isField ? 'My Jobs' : 'Jobs', href: isField ? '/my-jobs' : '/jobs', Icon: isField ? MyJobsIcon : JobsIcon } : null,
    can(permissions, 'schedule')  ? { name: 'Schedule',  href: '/schedule',                        Icon: ScheduleIcon  } : null,
    can(permissions, 'staff')     ? { name: 'Staff',     href: '/staff',                           Icon: StaffIcon     } : null,
  ].filter(Boolean) as NavItem[]
  if (opItems.length > 0) sections.push({ label: 'OPERATIONS', items: opItems })

  const finItems: NavItem[] = [
    can(permissions, 'quotes')   ? { name: 'Quotes',   href: '/quotes',   Icon: QuotesIcon   } : null,
    can(permissions, 'invoices') ? { name: 'Invoices', href: '/invoices', Icon: InvoicesIcon } : null,
  ].filter(Boolean) as NavItem[]
  if (finItems.length > 0) sections.push({ label: 'FINANCE', items: finItems })

  const clientItems: NavItem[] = [
    can(permissions, 'clients') ? { name: 'Clients', href: '/clients', Icon: ClientsIcon } : null,
    can(permissions, 'leads')   ? { name: 'Leads',   href: '/leads',   Icon: LeadsIcon   } : null,
  ].filter(Boolean) as NavItem[]
  if (clientItems.length > 0) sections.push({ label: 'CLIENTS', items: clientItems })

  const settingsItems: NavItem[] = [
    can(permissions, 'settings') ? { name: 'Notifications', href: '/settings/notifications', Icon: BellIcon } : null,
  ].filter(Boolean) as NavItem[]
  if (settingsItems.length > 0) sections.push({ label: 'SETTINGS', items: settingsItems })

  return sections
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  role: string
  userName?: string | null
  userEmail?: string | null
  permissions?: PermissionMap | null
  onNavigate?: () => void
}

const ROLE_DISPLAY: Record<string, string> = {
  admin:      'Administrator',
  supervisor: 'Supervisor',
  field:      'Field Staff',
}

export default function Sidebar({ role, userName, userEmail, permissions, onNavigate }: Props) {
  const pathname = usePathname()
  const sections = role === 'admin' ? ADMIN_SECTIONS : buildDynamicSections(role, permissions ?? null)

  const initials = userName
    ? userName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (userEmail?.charAt(0).toUpperCase() ?? '?')

  const displayRole = ROLE_DISPLAY[role] ?? 'Field Staff'
  const displayName = userName ?? userEmail ?? 'User'

  return (
    <aside className="w-64 shrink-0 bg-black h-full flex flex-col">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5">
        <Link href="/dashboard" className="text-xl font-bold tracking-[0.25em]" style={{ color: '#B8922A' }}>
          SIMOFY
        </Link>
      </div>

      <div className="h-px mx-4 mb-4" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* Nav sections */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto scrollbar-hidden">
        {/* Global search */}
        <div className="mb-4">
          <p
            className="px-3 mb-1.5 text-[10px] font-bold tracking-[0.18em]"
            style={{ color: 'rgba(184,146,42,0.65)' }}
          >
            SEARCH
          </p>
          <GlobalSearch onNavigate={onNavigate} />
        </div>

        {sections.map((section, si) => (
          <div key={section.label} className={si > 0 ? 'mt-5' : ''}>
            <p
              className="px-3 mb-1.5 text-[10px] font-bold tracking-[0.18em]"
              style={{ color: 'rgba(184,146,42,0.65)' }}
            >
              {section.label}
            </p>
            {section.items.map(({ name, href, Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md mb-0.5 text-sm font-medium transition-colors duration-150"
                  style={{
                    color:      isActive ? '#B8922A'                : 'rgba(255,255,255,0.45)',
                    background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderLeft: isActive ? '2px solid #B8922A' : '2px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.color      = 'rgba(255,255,255,0.9)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.color      = 'rgba(255,255,255,0.45)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <Icon />
                  {name}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="h-px mx-4" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* User profile */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
            style={{ background: '#B8922A', color: '#fff' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {displayName}
            </p>
            <p className="text-[10px] truncate mt-px" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {displayRole}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 pt-1">
        <LogoutButton />
      </div>
    </aside>
  )
}
