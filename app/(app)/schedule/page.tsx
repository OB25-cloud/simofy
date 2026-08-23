import ScheduleView from '@/app/components/schedule/ScheduleView'

export default function SchedulePage() {
  // Anchored to the viewport directly (not a percentage of `main`) so the
  // flex-1/min-h-0 chain below has a guaranteed-definite height to resolve
  // against — matches AppShell's real available height exactly: main has no
  // padding, and on desktop there's no chrome above it (the mobile top bar,
  // subtracted below, is md:hidden).
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen p-4 md:p-8 md:pb-4">
      <ScheduleView />
    </div>
  )
}
