import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { LandingHeader } from '@/features/landing/components/landing-header'
import { LandingHero } from '@/features/landing/components/landing-hero'
import { LandingFeatures } from '@/features/landing/components/landing-features'
import { LandingWorkflow } from '@/features/landing/components/landing-workflow'
import { LandingProductTour } from '@/features/landing/components/landing-product-tour'
import { LandingFaq } from '@/features/landing/components/landing-faq'
import { LandingCta } from '@/features/landing/components/landing-cta'
import { LandingFooter } from '@/features/landing/components/landing-footer'
import { useScrollReveal } from '@/features/landing/hooks/use-scroll-reveal'

export function LandingPage() {
  const { hash, key } = useLocation()
  const landingRef = useRef<HTMLDivElement>(null)
  const initialNavigation = useRef(true)
  useScrollReveal(landingRef)
  useEffect(() => {
    document.title = 'Orbit — Grandes ideias. Na mesma órbita.'
    // Direct links land immediately; subsequent anchor navigation follows CSS motion preferences.
    const behavior = initialNavigation.current ? 'instant' : 'auto'
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior })
    else window.scrollTo({ top: 0, behavior })
    initialNavigation.current = false
  }, [hash, key])

  return (
    <div ref={landingRef} className="landing-page">
      <a href="#landing-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <LandingHeader />
      <main id="landing-content" tabIndex={-1}>
        <LandingHero />
        <LandingFeatures />
        <LandingWorkflow />
        <LandingProductTour />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
