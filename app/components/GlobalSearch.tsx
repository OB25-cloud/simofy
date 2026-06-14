'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ResultType = 'client' | 'job' | 'quote' | 'invoice' | 'lead' | 'staff'

type SearchResult = {
  id: string
  type: ResultType
  title: string
  subtitle: string
  href: string
}

const GROUPS: { type: ResultType; label: string }[] = [
  { type: 'client',  label: 'Clients'  },
  { type: 'job',     label: 'Jobs'     },
  { type: 'staff',   label: 'Staff'    },
  { type: 'quote',   label: 'Quotes'   },
  { type: 'invoice', label: 'Invoices' },
  { type: 'lead',    label: 'Leads'    },
]

async function runSearch(query: string): Promise<SearchResult[]> {
  const raw = query.trim()
  if (!raw) return []

  // Strip QUO-/INV- prefix so users can search by the displayed short code
  const stripped     = raw.replace(/^(QUO|INV)-/i, '')
  const firstStrip   = stripped.split(/\s+/)[0] ?? stripped

  // Split into words so "charmila paterson" matches across separate name fields.
  // Each word is ANDed — every word must match at least one column.
  const words = raw.split(/\s+/).filter(Boolean)

  // Clients: every word must appear in name, email, or phone
  // eslint-disable-next-line prefer-const
  let clientQ = supabase.from('clients').select('id, name, email, phone')
  for (const w of words) clientQ = clientQ.or(`name.ilike.%${w}%,email.ilike.%${w}%,phone.ilike.%${w}%`)

  // Jobs: every word must appear in title, job_type, or status
  // eslint-disable-next-line prefer-const
  let jobQ = supabase.from('jobs').select('id, title, job_type, status')
  for (const w of words) jobQ = jobQ.or(`title.ilike.%${w}%,job_type.ilike.%${w}%,status.ilike.%${w}%`)

  // Staff: every word must appear in name, email, phone, or role
  // eslint-disable-next-line prefer-const
  let staffQ = supabase.from('staff').select('id, name, email, phone, role')
  for (const w of words) staffQ = staffQ.or(`name.ilike.%${w}%,email.ilike.%${w}%,phone.ilike.%${w}%,role.ilike.%${w}%`)

  // Leads: every word must appear in name, email, or message
  // eslint-disable-next-line prefer-const
  let leadQ = supabase.from('leads').select('id, name, email, message')
  for (const w of words) leadQ = leadQ.or(`name.ilike.%${w}%,email.ilike.%${w}%,message.ilike.%${w}%`)

  // Invoices: search by status only, no join to avoid relationship naming issues
  // eslint-disable-next-line prefer-const
  let invoiceQ = supabase.from('invoices').select('id, total, status')
  for (const w of words) invoiceQ = invoiceQ.ilike('status', `%${w}%`)

  const [
    { data: clients },
    { data: jobs },
    { data: staff },
    { data: quotes },
    { data: invoices },
    { data: leads },
  ] = await Promise.all([
    clientQ.limit(5),
    jobQ.limit(5),
    staffQ.limit(5),
    supabase.from('quotes')
      .select('id, total, jobs(title, job_type)')
      .ilike('id', `%${firstStrip}%`)
      .limit(5),
    invoiceQ.limit(5),
    leadQ.limit(5),
  ])

  const results: SearchResult[] = []

  for (const c of clients ?? []) {
    results.push({
      id: c.id, type: 'client',
      title: c.name ?? 'Unnamed',
      subtitle: [c.email, c.phone].filter(Boolean).join(' · '),
      href: `/clients/${c.id}`,
    })
  }

  for (const j of jobs ?? []) {
    results.push({
      id: j.id, type: 'job',
      title: j.title ?? j.job_type ?? 'Untitled Job',
      subtitle: j.status ? j.status.replace(/_/g, ' ') : '',
      href: `/jobs/${j.id}`,
    })
  }

  for (const s of staff ?? []) {
    results.push({
      id: s.id, type: 'staff',
      title: s.name ?? 'Unnamed',
      subtitle: s.role ?? s.email ?? '',
      href: `/staff/${s.id}`,
    })
  }

  for (const q of quotes ?? []) {
    const job = q.jobs as { title?: string | null; job_type?: string | null } | null
    results.push({
      id: q.id, type: 'quote',
      title: `QUO-${q.id.slice(0, 6).toUpperCase()}`,
      subtitle: job?.title ?? job?.job_type ?? '',
      href: `/quotes/${q.id}`,
    })
  }

  for (const inv of invoices ?? []) {
    results.push({
      id: inv.id, type: 'invoice',
      title: `INV-${inv.id.slice(0, 6).toUpperCase()}`,
      subtitle: inv.status ?? '',
      href: `/invoices/${inv.id}`,
    })
  }

  for (const l of leads ?? []) {
    results.push({
      id: l.id, type: 'lead',
      title: l.name ?? 'Unnamed Lead',
      subtitle: l.email ?? '',
      href: `/leads/${l.id}`,
    })
  }

  return results
}

export default function GlobalSearch({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)
  const router                = useRouter()

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    const t = setTimeout(() => {
      runSearch(query).then(r => { setResults(r); setLoading(false) })
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Keyboard shortcut ⌘K / Ctrl+K + ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) {
          close()
        } else {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }
      }
      if (e.key === 'Escape' && open) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function close() {
    setOpen(false)
    setQuery('')
    setResults([])
    setLoading(false)
  }

  function openModal() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function navigate(href: string) {
    router.push(href)
    close()
    onNavigate?.()
  }

  const grouped = GROUPS
    .map(g => ({ ...g, items: results.filter(r => r.type === g.type) }))
    .filter(g => g.items.length > 0)

  return (
    <>
      {/* Sidebar trigger button */}
      <button
        onClick={openModal}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-0.5 text-sm font-medium transition-colors duration-150"
        style={{ color: 'rgba(255,255,255,0.45)', background: 'transparent', borderLeft: '2px solid transparent' }}
        onMouseEnter={e => {
          e.currentTarget.style.color      = 'rgba(255,255,255,0.9)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color      = 'rgba(255,255,255,0.45)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <SearchIcon />
        Search
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) close() }}
        >
          <div
            className="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl"
            style={{ background: '#111', border: '1px solid rgba(184,146,42,0.25)' }}
          >
            {/* Input row */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 border-b"
              style={{ borderColor: 'rgba(184,146,42,0.15)' }}
            >
              <span style={{ color: 'rgba(184,146,42,0.7)', flexShrink: 0 }}>
                <SearchIcon />
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search clients, jobs, quotes, invoices, leads..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              />
              {loading && (
                <span className="shrink-0 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>
              )}
              <button
                onClick={close}
                className="shrink-0 text-[10px] px-2 py-1 rounded"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
              >
                ESC
              </button>
            </div>

            {/* Results */}
            {grouped.length > 0 ? (
              <div className="max-h-[55vh] overflow-y-auto py-2">
                {grouped.map(group => (
                  <div key={group.type}>
                    <p
                      className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-[0.15em]"
                      style={{ color: 'rgba(184,146,42,0.55)' }}
                    >
                      {group.label}
                    </p>
                    {group.items.map(result => (
                      <button
                        key={result.id}
                        onClick={() => navigate(result.href)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{ borderLeft: '3px solid transparent' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background      = 'rgba(255,255,255,0.04)'
                          e.currentTarget.style.borderLeftColor = '#B8922A'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background      = 'transparent'
                          e.currentTarget.style.borderLeftColor = 'transparent'
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs truncate mt-0.5 capitalize" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <span className="text-sm shrink-0" style={{ color: 'rgba(184,146,42,0.5)' }}>→</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : query.trim() && !loading ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Start typing to search across all records
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
