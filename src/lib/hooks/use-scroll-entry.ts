import { useLayoutEffect, type RefObject } from 'react'
import { clearScrollEntryProgress, writeScrollEntryProgress } from '@/lib/dom/scroll-entry-progress'

/** Observe a stable wrapper; only its child should be transformed by CSS. */
export function useScrollEntry(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const motion = window.matchMedia('(prefers-reduced-motion: no-preference)')
    let frame: number | null = null

    function update() {
      frame = null
      if (element && motion.matches) writeScrollEntryProgress(element)
    }

    function scheduleUpdate() {
      if (frame === null) frame = window.requestAnimationFrame(update)
    }

    const resize = new ResizeObserver(scheduleUpdate)

    function stop() {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      resize.disconnect()
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = null
      if (element) {
        delete element.dataset.scrollEntry
        clearScrollEntryProgress(element)
      }
    }

    function synchronizeMotion() {
      stop()
      if (!element || !motion.matches) return
      // Set the initial position before paint, without a timer or autoplay.
      update()
      element.dataset.scrollEntry = 'true'
      window.addEventListener('scroll', scheduleUpdate, { passive: true })
      window.addEventListener('resize', scheduleUpdate)
      resize.observe(element)
      // Includes font/image layout changes in the surrounding section.
      if (element.parentElement) resize.observe(element.parentElement)
    }

    synchronizeMotion()
    motion.addEventListener('change', synchronizeMotion)
    return () => {
      stop()
      motion.removeEventListener('change', synchronizeMotion)
    }
  }, [ref])
}
