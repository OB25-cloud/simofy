'use client'

import { useDroppable } from '@dnd-kit/core'
import { PanelJobCard } from './JobBlock'
import type { ScheduleJob } from './scheduleDates'

export const PANEL_DROP_ID = 'panel:unassigned'

interface Props {
  inRange: ScheduleJob[]
  upcoming: ScheduleJob[]
  rangeLabel: string
  collapsed: boolean
  onToggle: () => void
  onOpen: (job: ScheduleJob) => void
  onReschedulePicker: (job: ScheduleJob) => void
  onAddJob: () => void
}

function IconInbox() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-1.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">{title}</p>
        <span className="text-[10.5px] font-semibold tabular-nums text-ink-faint">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

// Collapsible left rail of jobs with no staff. Cards drag onto a staff row
// (day) or cell (week) to assign; assigned blocks can be dropped back here
// to unassign. Split into the visible range and the next few weeks so a job
// dated elsewhere can still be pulled onto today's board.
export default function UnassignedPanel({ inRange, upcoming, rangeLabel, collapsed, onToggle, onOpen, onReschedulePicker, onAddJob }: Props) {
  const { setNodeRef, isOver, active } = useDroppable({ id: PANEL_DROP_ID })
  const total = inRange.length + upcoming.length
  const canReceive = !!active && (active.data.current as { source?: string } | undefined)?.source === 'board'

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={[
          'shrink-0 w-11 flex flex-col items-center bg-surface rounded-xl border shadow-card py-3 gap-3 transition-colors',
          isOver ? 'border-accent bg-accent-soft' : 'border-line',
        ].join(' ')}
      >
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
          aria-label="Show unassigned jobs"
          title="Show unassigned jobs"
        >
          <IconInbox />
        </button>
        {total > 0 && (
          <span className="text-[10.5px] font-bold tabular-nums px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25">
            {total}
          </span>
        )}
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint mt-1"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Unassigned
        </span>
      </div>
    )
  }

  return (
    <aside
      className={[
        'shrink-0 w-[272px] flex flex-col bg-surface rounded-xl border shadow-card overflow-hidden transition-colors',
        isOver ? 'border-accent' : 'border-line',
      ].join(' ')}
    >
      <div className="shrink-0 flex items-center gap-2 px-3.5 py-3 border-b border-line bg-surface-muted/70">
        <span className="text-ink-muted"><IconInbox /></span>
        <h2 className="text-[12px] font-semibold text-ink">Unassigned</h2>
        {total > 0 ? (
          <span className="text-[10.5px] font-bold tabular-nums px-1.5 py-px rounded-md bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25">{total}</span>
        ) : (
          <span className="text-[10.5px] font-bold px-1.5 py-px rounded-md bg-accent-soft text-accent">0</span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-ink-muted hover:text-ink hover:bg-white transition-colors"
          aria-label="Collapse panel"
          title="Collapse"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={['relative flex-1 min-h-0 overflow-y-auto p-3 space-y-4 transition-colors', isOver ? 'bg-accent-soft/60' : ''].join(' ')}
      >
        {canReceive && (
          <div className="pointer-events-none absolute inset-2 rounded-lg border-[1.5px] border-dashed border-accent/60 flex items-center justify-center z-10">
            <span className="text-[11px] font-semibold text-accent bg-white/90 px-2 py-1 rounded-md shadow-sm">Drop to unassign</span>
          </div>
        )}

        {total === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <span className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <p className="text-sm font-semibold text-ink">All jobs assigned</p>
            <p className="text-xs text-ink-muted mt-1">Drag a block here to unassign it, or add a job below.</p>
          </div>
        ) : (
          <>
            {inRange.length > 0 && (
              <Section title={rangeLabel} count={inRange.length}>
                {inRange.map(job => <PanelJobCard key={job.id} job={job} onOpen={onOpen} onReschedulePicker={onReschedulePicker} />)}
              </Section>
            )}
            {upcoming.length > 0 && (
              <Section title="Other dates" count={upcoming.length}>
                {upcoming.map(job => <PanelJobCard key={job.id} job={job} onOpen={onOpen} onReschedulePicker={onReschedulePicker} />)}
              </Section>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-line p-2.5">
        <button
          onClick={onAddJob}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New unassigned job
        </button>
        <p className="text-[10.5px] text-ink-faint text-center mt-1.5">Drag cards onto a staff row to assign</p>
      </div>
    </aside>
  )
}
