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
function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function ChecklistIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 9l1.5 1.5L11 8" /><path d="M7 16l1.5 1.5L11 15" />
      <line x1="13.5" y1="9" x2="17" y2="9" /><line x1="13.5" y1="16" x2="17" y2="16" />
    </svg>
  )
}
function ReportsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <rect x="7" y="13" width="3" height="5" /><rect x="12" y="9" width="3" height="9" /><rect x="17" y="6" width="3" height="12" />
    </svg>
  )
}
function PurchaseOrderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6a2 2 0 0 1 2 2v18l-5-3-5 3V4a2 2 0 0 1 2-2Z" />
      <line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  )
}

// Brand mark: a simple leaf, rendered inside the green logo tile.
function LogoMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  )
}

// Section labels: tiny, muted, wide-tracked.
const SECTION_LABEL_CLASSES =
  'text-[10.5px] font-semibold text-[var(--sidebar-label)] uppercase tracking-[0.14em] mb-2.5'

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
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { name: 'Quotes',          href: '/quotes',          Icon: QuotesIcon       },
      { name: 'Invoices',       href: '/invoices',         Icon: InvoicesIcon     },
      { name: 'Purchase Orders', href: '/purchase-orders', Icon: PurchaseOrderIcon },
      { name: 'Reports',        href: '/reports',          Icon: ReportsIcon      },
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
      { name: 'Staff',         href: '/staff',                  Icon: StaffIcon     },
      { name: 'Notifications', href: '/settings/notifications', Icon: BellIcon      },
      { name: 'Users',         href: '/settings/users',         Icon: UsersIcon     },
      { name: 'Checklists',    href: '/settings/checklists',    Icon: ChecklistIcon },
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
    can(permissions, 'staff')    ? { name: 'Staff',         href: '/staff',                  Icon: StaffIcon } : null,
    can(permissions, 'settings') ? { name: 'Notifications', href: '/settings/notifications', Icon: BellIcon  } : null,
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
  onCollapse?: () => void
  /** Icon-only rail (desktop collapsed state). */
  collapsed?: boolean
  onExpand?: () => void
  demoMode?: boolean
  companyName?: string
}

const ROLE_DISPLAY: Record<string, string> = {
  admin:      'Administrator',
  supervisor: 'Supervisor',
  field:      'Field Staff',
}

export default function Sidebar({ role, userName, userEmail, permissions, onNavigate, onCollapse, collapsed, onExpand, demoMode, companyName }: Props) {
  const pathname = usePathname()
  const sections = role === 'admin' ? ADMIN_SECTIONS : buildDynamicSections(role, permissions ?? null)
  // Every nav href above is written as a real, unprefixed app route
  // ('/jobs', '/schedule', ...) — prefixed here rather than in the nav
  // config so the same config works for both the real app and demo.
  const basePath = demoMode ? '/demo' : ''

  const initials = userName
    ? userName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (userEmail?.charAt(0).toUpperCase() ?? '?')

  const displayRole = ROLE_DISPLAY[role] ?? 'Field Staff'
  const displayName = userName ?? userEmail ?? 'User'

  // Collapsed rail: same sections and active states, icons only, with the
  // item name as a hover tooltip. Logo and profile stay pinned as before.
  if (collapsed) {
    return (
      <aside className="w-full h-full bg-sidebar flex flex-col items-center">
        <div className="pt-5 pb-3 flex flex-col items-center gap-1.5 shrink-0">
          <Link href={`${basePath}/dashboard`} title="Operify" aria-label="Operify dashboard" className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            <LogoMark />
          </Link>
          {onExpand && (
            <button
              onClick={onExpand}
              className="flex items-center justify-center w-7 h-7 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <ChevronRightIcon />
            </button>
          )}
        </div>

        <nav className="flex-1 min-h-0 w-full overflow-y-auto sidebar-scroll flex flex-col items-center px-2 pb-3">
          {sections.map((section, si) => (
            <div
              key={section.label}
              className={['w-full flex flex-col items-center', si > 0 ? 'mt-2 pt-2 border-t border-[var(--sidebar-line)]' : ''].join(' ')}
            >
              {section.items.map(({ name, href, Icon }) => {
                const isActive = pathname === `${basePath}${href}` || pathname.startsWith(`${basePath}${href}/`)
                return (
                  <Link
                    key={href}
                    href={`${basePath}${href}`}
                    onClick={onNavigate}
                    title={name}
                    aria-label={name}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'relative flex items-center justify-center w-10 h-10 rounded-lg mb-1 transition-colors duration-150',
                      isActive
                        ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)]'
                        : 'text-white/55 hover:bg-[var(--sidebar-hover)] hover:text-white',
                    ].join(' ')}
                  >
                    {isActive && (
                      <span aria-hidden className="absolute -left-2 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-[var(--sidebar-active-fg)]" />
                    )}
                    <Icon />
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="w-full border-t border-[var(--sidebar-line)] py-3 flex flex-col items-center gap-2 shrink-0">
          <div className="relative" title={`${demoMode ? 'Demo User' : displayName} · ${companyName ?? displayRole}`}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', boxShadow: '0 0 0 2px rgba(74,222,128,0.18)' }}
            >
              {initials}
            </div>
            <span aria-hidden className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-[#4ade80] ring-2 ring-[var(--sidebar-bg)]" />
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-full h-full bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <Link href={`${basePath}/dashboard`} className="flex items-center gap-2.5 group">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            <LogoMark />
          </span>
          <span className="text-[15px] font-bold tracking-[0.18em] text-white">OPERIFY</span>
        </Link>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="hidden md:flex items-center justify-center w-7 h-7 -mr-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeftIcon />
          </button>
        )}
      </div>

      {/* Nav sections */}
      {/* Only this list scrolls — the logo above and the profile row below stay pinned. */}
      <nav className="flex-1 min-h-0 px-2 pb-4 overflow-y-auto sidebar-scroll">
        {/* Global search */}
        <div className="mb-5 px-2">
          <p className={`${SECTION_LABEL_CLASSES} px-2`}>Search</p>
          <GlobalSearch onNavigate={onNavigate} basePath={basePath} />
        </div>

        {sections.map((section, si) => (
          <div key={section.label} className={si > 0 ? 'mt-7' : ''}>
            <p className={`${SECTION_LABEL_CLASSES} px-4`}>
              {section.label}
            </p>
            {section.items.map(({ name, href, Icon }) => {
              const isActive = pathname === `${basePath}${href}` || pathname.startsWith(`${basePath}${href}/`)
              return (
                <Link
                  key={href}
                  href={`${basePath}${href}`}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'relative flex items-center gap-3 px-4 py-2 rounded-lg mx-2 mb-1 text-[13.5px] transition-colors duration-150',
                    isActive
                      ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)] font-medium'
                      : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white',
                  ].join(' ')}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-[var(--sidebar-active-fg)]"
                    />
                  )}
                  <span className={isActive ? 'text-[var(--sidebar-active-fg)]' : 'text-white/45'}>
                    <Icon />
                  </span>
                  {name}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--sidebar-line)] p-3">
        {/* User profile */}
        <div className="flex items-center gap-3 px-2 py-2.5 mb-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', boxShadow: '0 0 0 2px rgba(74,222,128,0.18)' }}
            >
              {initials}
            </div>
            <span aria-hidden className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-[#4ade80] ring-2 ring-[var(--sidebar-bg)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate text-white leading-tight">
              {demoMode ? 'Demo User' : displayName}
            </p>
            <p className="text-[11px] truncate mt-0.5 text-[var(--sidebar-text)] leading-tight">
              {companyName ?? displayRole}
            </p>
          </div>
          <span
            className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(74,222,128,0.12)', color: 'var(--accent-bright)' }}
          >
            {demoMode ? 'Admin' : displayRole.split(' ')[0]}
          </span>
        </div>
        {demoMode ? (
          <Link
            href="/demo"
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-[13.5px] transition-colors duration-150 text-[var(--sidebar-text)] hover:text-white hover:bg-[var(--sidebar-hover)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Exit demo
          </Link>
        ) : (
          <LogoutButton />
        )}
      </div>
    </aside>
  )
}
