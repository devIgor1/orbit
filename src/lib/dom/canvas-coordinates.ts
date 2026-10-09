import { useLayoutEffect, useRef } from 'react'

export type CanvasPoint = { x: number; y: number }

/** Technical adapter for measured canvas coordinates only (AGENTS §3).
 * Design dimensions are read from globals.css. Runtime writes contain only
 * pointer-derived positions and the scale calculated from available width.
 * Colors, typography, spacing, shadows and animation remain in the stylesheet.
 */
export function readCanvasNumber(element: HTMLElement, name: string): number {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(name))
  if (!Number.isFinite(value)) throw new Error(`Missing canvas geometry token: ${name}`)
  return value
}

export function writeCanvasScale(element: HTMLElement, scale: number) {
  element.style.setProperty('--canvas-scale', String(scale))
}

export function useCanvasPosition<T extends HTMLElement>(point: CanvasPoint) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.setProperty('--canvas-x', `${point.x}px`)
    element.style.setProperty('--canvas-y', `${point.y}px`)
  }, [point.x, point.y])
  return ref
}
