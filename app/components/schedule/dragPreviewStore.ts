import { useSyncExternalStore } from 'react'

// Live drop preview for the Day board. Updated on every pointer move while
// dragging, so it lives in a tiny external store rather than React state on
// the whole scheduler: only the row being hovered subscribes/re-renders.
export type DropPreview = {
  rowId: string
  startMin: number
  endMin: number
  jobId: string
}

let current: DropPreview | null = null
const listeners = new Set<() => void>()

export function setDropPreview(next: DropPreview | null) {
  if (current === next) return
  if (
    current && next &&
    current.rowId === next.rowId && current.startMin === next.startMin &&
    current.endMin === next.endMin && current.jobId === next.jobId
  ) return
  current = next
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// Returns the preview only when it targets `rowId`, so other rows see a
// stable `null` and skip re-rendering.
export function useDropPreview(rowId: string): DropPreview | null {
  return useSyncExternalStore(
    subscribe,
    () => (current && current.rowId === rowId ? current : null),
    () => null,
  )
}
