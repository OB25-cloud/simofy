'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import GlobalSearch from './GlobalSearch'
import BrandMark from './BrandMark'
import type { PermissionMap, Module } from '@/lib/permissions'

// ─── chevrons (collapse / expand controls only) ─────────────────────────────

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

// Section labels: tiny, muted, wide-tracked.
const SECTION_LABEL_CLASSES =
  'text-[10.5px] font-semibold text-[var(--sidebar-label)] uppercase tracking-[0.14em] mb-2'

// Nav rows are text-only, so the type does the work: a touch larger and
// heavier than body copy, with slightly open tracking so short labels
// ("Jobs", "Leads") still feel deliberate.
const NAV_TEXT_CLASSES = 'text-[14px] font-semibold tracking-[0.02em]'

// Collapsed rail shows a two-letter abbreviation instead of an icon:
// "Jo" for Jobs, "PO" for Purchase Orders, "MJ" for My Jobs.
function abbrev(name: string): string {
  const words = name.split(' ').filter(Boolean)
  if (words.length > 1) return words.map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return name.slice(0, 2)
}

// ─── nav config ─────────────────────────────────────────────────────────────

type NavItem = { name: string; href: string }
type Section = { label: string; items: NavItem[] }

const ADMIN_SECTIONS: Section[] = [
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Jobs', href: '/jobs' },
      { name: 'Schedule', href: '/schedule' },
    ],
  },
  {
    label: 'CLIENTS',
    items: [
      { name: 'Clients', href: '/clients' },
      { name: 'Leads', href: '/leads' },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { name: 'Quotes', href: '/quotes' },
      { name: 'Invoices', href: '/invoices' },
      { name: 'Purchase Orders', href: '/purchase-orders' },
      { name: 'Reports', href: '/reports' },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { name: 'Staff', href: '/staff' },
      { name: 'Notifications', href: '/settings/notifications' },
      { name: 'Users', href: '/settings/users' },
      { name: 'Checklists', href: '/settings/checklists' },
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
    can(permissions, 'dashboard') ? { name: 'Dashboard', href: '/dashboard' } : null,
    can(permissions, 'jobs')      ? { name: isField ? 'My Jobs' : 'Jobs', href: isField ? '/my-jobs' : '/jobs' } : null,
    can(permissions, 'schedule')  ? { name: 'Schedule', href: '/schedule' } : null,
  ].filter(Boolean) as NavItem[]
  if (opItems.length > 0) sections.push({ label: 'OPERATIONS', items: opItems })

  const clientItems: NavItem[] = [
    can(permissions, 'clients') ? { name: 'Clients', href: '/clients' } : null,
    can(permissions, 'leads')   ? { name: 'Leads', href: '/leads' } : null,
  ].filter(Boolean) as NavItem[]
  if (clientItems.length > 0) sections.push({ label: 'CLIENTS', items: clientItems })

  const finItems: NavItem[] = [
    can(permissions, 'quotes')   ? { name: 'Quotes', href: '/quotes' } : null,
    can(permissions, 'invoices') ? { name: 'Invoices', href: '/invoices' } : null,
  ].filter(Boolean) as NavItem[]
  if (finItems.length > 0) sections.push({ label: 'FINANCE', items: finItems })

  const settingsItems: NavItem[] = [
    can(permissions, 'staff')    ? { name: 'Staff', href: '/staff' } : null,
    can(permissions, 'settings') ? { name: 'Notifications', href: '/settings/notifications' } : null,
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
  /** Narrow rail (desktop collapsed state): brand mark + two-letter abbreviations. */
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

  // Collapsed rail: same sections and active states, each item reduced to a
  // two-letter abbreviation with the full name as a hover tooltip. Brand
  // mark and profile stay pinned as before.
  if (collapsed) {
    return (
      <aside className="w-full h-full bg-sidebar flex flex-col items-center">
        <div className="pt-5 pb-3 flex flex-col items-center gap-1.5 shrink-0">
          <Link href={`${basePath}/dashboard`} title="Runsite" aria-label="Runsite dashboard" className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--accent-bright)] hover:bg-[var(--sidebar-hover)] transition-colors">
            <BrandMark size={24} />
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
              {section.items.map(({ name, href }) => {
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
                      'relative flex items-center justify-center w-10 h-10 rounded-lg mb-1 text-[12px] font-semibold tracking-[0.04em] transition-colors duration-150',
                      isActive
                        ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)]'
                        : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white',
                    ].join(' ')}
                  >
                    {isActive && (
                      <span aria-hidden className="absolute -left-2 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-[var(--sidebar-active-fg)]" />
                    )}
                    <span aria-hidden>{abbrev(name)}</span>
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
          <span className="flex items-center justify-center w-7 h-7 -ml-0.5 text-[var(--accent-bright)]">
            <BrandMark size={24} />
          </span>
          <span className="text-[15px] font-bold tracking-[0.18em] text-white">RUNSITE</span>
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
            {section.items.map(({ name, href }) => {
              const isActive = pathname === `${basePath}${href}` || pathname.startsWith(`${basePath}${href}/`)
              return (
                <Link
                  key={href}
                  href={`${basePath}${href}`}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    `relative flex items-center px-4 py-[7px] rounded-lg mx-2 mb-0.5 ${NAV_TEXT_CLASSES} transition-colors duration-150`,
                    isActive
                      ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)]'
                      : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white',
                  ].join(' ')}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-[var(--sidebar-active-fg)]"
                    />
                  )}
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
            className={`flex items-center w-full px-4 py-[7px] rounded-lg ${NAV_TEXT_CLASSES} transition-colors duration-150 text-[var(--sidebar-text)] hover:text-white hover:bg-[var(--sidebar-hover)]`}
          >
            Exit demo
          </Link>
        ) : (
          <LogoutButton />
        )}
      </div>
    </aside>
  )
}
