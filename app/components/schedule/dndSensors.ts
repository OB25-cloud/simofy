import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'

// MouseSensor (not PointerSensor, which also listens to touch and would race
// the TouchSensor below) starts a drag after a small mouse movement.
// TouchSensor needs a brief press-and-hold with a movement tolerance, so a
// quick tap on a job block still opens it instead of being swallowed as an
// accidental drag.
export function useScheduleSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )
}

// A completed drag is followed by a synthetic click on the block that was
// dragged (mousedown + mouseup on the same element). Blocks check this so a
// drop never also opens the job detail panel.
let lastDragEndedAt = 0

export function markDragEnded() {
  lastDragEndedAt = Date.now()
}

export function recentlyDragged(): boolean {
  return Date.now() - lastDragEndedAt < 250
}
