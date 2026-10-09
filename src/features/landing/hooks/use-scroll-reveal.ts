import { useEffect, type RefObject } from 'react'

const revealSelector = [
  '.landing-section-heading',
  '.landing-feature-tabs',
  '.landing-feature-showcase',
  '.workflow-interactive',
  '.landing-tour-stage',
  '.landing-faq-item',
  '.landing-cta-panel',
].join(', ')

/**
 * Enhances the landing's static descendants with one-time scroll reveals.
 * Content stays visible without this hook, IntersectionObserver, or motion consent.
 * Only offscreen elements receive `data-reveal="pending"`; CSS in globals.css owns
 * appearance and transitions for pending/visible. Viewport measurements and the
 * observer margin determine intersection only, never presentation styles.
 * Focus and same-page anchors reveal their containing/target section immediately.
 * Switching to reduced motion reveals everything permanently for this mount.
 * Cleanup removes all owned attributes/listeners, including StrictMode remounts.
 */
export function useScrollReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root || typeof window.IntersectionObserver !== 'function' || typeof window.matchMedia !== 'function') return

    const motion = window.matchMedia('(prefers-reduced-motion: no-preference)')
    if (!motion.matches) return

    const targets = Array.from(root.querySelectorAll<HTMLElement>(revealSelector))
    let active = true
    const observer = new IntersectionObserver(
      (entries) => {
        if (!active) return
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) reveal(entry.target)
        }
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.08 },
    )

    function reveal(target: HTMLElement) {
      target.dataset.reveal = 'visible'
      observer.unobserve(target)
    }

    function revealRelated(element: Element | null) {
      if (!element || !root?.contains(element)) return
      for (const target of targets) {
        if (target.contains(element) || element.contains(target)) reveal(target)
      }
    }

    function revealHash(hash: string) {
      if (!hash) return
      let id = hash.slice(1)
      try {
        id = decodeURIComponent(id)
      } catch {
        /* A literal malformed fragment may still match an ID. */
      }
      revealRelated(document.getElementById(id))
    }

    function handleHashChange() {
      revealHash(window.location.hash)
    }
    function handleFocus(event: FocusEvent) {
      if (event.target instanceof Element) revealRelated(event.target)
    }
    function handleAnchor(event: MouseEvent) {
      if (!(event.target instanceof Element)) return
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return
      const destination = new URL(anchor.href, window.location.href)
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        revealHash(destination.hash)
      }
    }
    function handleMotionChange() {
      if (motion.matches) return
      targets.forEach(reveal)
      observer.disconnect()
    }

    for (const target of targets) {
      const bounds = target.getBoundingClientRect()
      const inViewport =
        bounds.bottom > 0 && bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth
      target.dataset.reveal = inViewport ? 'visible' : 'pending'
      if (!inViewport) observer.observe(target)
    }
    revealRelated(document.activeElement)
    handleHashChange()
    root.addEventListener('focusin', handleFocus)
    root.addEventListener('click', handleAnchor, true)
    window.addEventListener('hashchange', handleHashChange)
    motion.addEventListener('change', handleMotionChange)

    return () => {
      active = false
      observer.disconnect()
      root.removeEventListener('focusin', handleFocus)
      root.removeEventListener('click', handleAnchor, true)
      window.removeEventListener('hashchange', handleHashChange)
      motion.removeEventListener('change', handleMotionChange)
      targets.forEach((target) => {
        delete target.dataset.reveal
      })
    }
  }, [ref])
}
