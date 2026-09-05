import ScheduleView from '@/app/components/schedule/ScheduleView'

export default function SchedulePage() {
  // Full-bleed: the scheduler owns the whole viewport below the mobile top
  // bar (md:hidden) and the demo banner (--demo-banner-h is 0px outside
  // /demo, see globals.css). No page padding — the stat bar, toolbar and
  // grid start at the very top edge and the grid fills whatever is left.
  return (
    <div className="flex flex-col h-[calc(100vh-56px-var(--demo-banner-h))] md:h-[calc(100vh-var(--demo-banner-h))]">
      <ScheduleView />
    </div>
  )
}
