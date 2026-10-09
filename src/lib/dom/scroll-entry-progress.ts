/**
 * Runtime geometry only: the untransformed wrapper enters from the viewport's
 * bottom and finishes centered (top-aligned when taller than the viewport).
 * Clamping the start to document zero prevents progress advancing on initial load.
 * globals.css owns all transforms, opacity and smoothing of the child surface.
 */
export function writeScrollEntryProgress(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  const viewport = window.innerHeight
  const top = bounds.top + window.scrollY
  const start = Math.max(0, top - viewport)
  const end = Math.max(start + 1, top - Math.max(0, (viewport - bounds.height) / 2))
  const progress = Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)))
  element.style.setProperty('--scroll-entry-progress', String(progress))
}

export function clearScrollEntryProgress(element: HTMLElement) {
  element.style.removeProperty('--scroll-entry-progress')
}
