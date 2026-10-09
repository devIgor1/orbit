import { useEffect, useState, type RefObject } from 'react'
import { landingNavigation } from '../landing-navigation'

export function useLandingNavigation(headerRef: RefObject<HTMLElement | null>) {
  const [navigation, setNavigation] = useState({ activeSection: '', scrolled: false })

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const sections = landingNavigation.map(({ id }) => document.getElementById(id))
    let frame = 0

    // Geometry is read only to identify the current section, never to author styles.
    function update() {
      frame = 0
      const headerBottom = header!.getBoundingClientRect().bottom
      const readingLine = headerBottom + (window.innerHeight - headerBottom) * 0.25
      let activeSection = ''
      for (const section of sections) {
        if (!section) continue
        const bounds = section.getBoundingClientRect()
        if (bounds.top <= readingLine && bounds.bottom > headerBottom) activeSection = section.id
      }
      const scrolled = window.scrollY > 0
      setNavigation((previous) =>
        previous.activeSection === activeSection && previous.scrolled === scrolled
          ? previous
          : { activeSection, scrolled },
      )
    }

    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate)
    for (const section of sections) if (section) observer?.observe(section)
    observer?.observe(header)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      observer?.disconnect()
    }
  }, [headerRef])

  return navigation
}
