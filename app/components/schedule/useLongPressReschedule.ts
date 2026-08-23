import { useEffect, useRef } from 'react'
import type { Job } from '@/lib/types'

// Long-press duration for the mobile "reschedule" context menu. Deliberately
// longer than dnd-kit's TouchSensor activation delay (200ms) — by the time
// this fires, dnd-kit may already be tracking a zero-movement "drag" on the
// same touch, but since the finger never moved to a different cell, its
// eventual onDragEnd is a no-op, so the two gestures don't actually
// conflict, just briefly overlap.
const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 10

export function useLongPressReschedule(job: Job, onReschedule: (job: Job) => void) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    function clearTimer() {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      if (!t) return
      touchStart.current = { x: t.clientX, y: t.clientY }
      longPressFiredRef.current = false
      clearTimer()
      longPressTimer.current = setTimeout(() => {
        longPressFiredRef.current = true
        onReschedule(job)
      }, LONG_PRESS_MS)
    }

    function onTouchMove(e: TouchEvent) {
      const start = touchStart.current
      const t = e.touches[0]
      if (!start || !t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_TOLERANCE) clearTimer()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', clearTimer)
    el.addEventListener('touchcancel', clearTimer)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', clearTimer)
      el.removeEventListener('touchcancel', clearTimer)
      clearTimer()
    }
  }, [job, onReschedule])

  return { elRef, longPressFiredRef }
}
