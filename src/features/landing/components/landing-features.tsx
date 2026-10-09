import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { landingFeatures } from '@/features/landing/landing-features'
import { LandingFeatureCard } from './landing-feature-card'

// Port of the licensed Aceternity Inference Features section. Presentation and
// motion values live in globals.css; Orbit capabilities replace sample metrics.
export function LandingFeatures() {
  const [activeIndex, setActiveIndex] = useState(0)
  const tabListRef = useRef<HTMLDivElement>(null)
  const tabsId = useId()
  const activeFeature = landingFeatures[activeIndex]

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % landingFeatures.length
        break
      case 'ArrowLeft':
        nextIndex = (index - 1 + landingFeatures.length) % landingFeatures.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = landingFeatures.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    setActiveIndex(nextIndex)
    tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
  }

  return (
    <section
      id="recursos"
      className="landing-section landing-features landing-features-original"
      aria-labelledby="features-title"
    >
      <div className="landing-container">
        <header className="landing-section-heading landing-feature-heading">
          <h2 id="features-title" className="landing-template-heading">
            Tudo entre a primeira ideia e a próxima entrega.
          </h2>
        </header>
        <div className="landing-feature-showcase" data-feature={activeFeature.id} aria-hidden="true">
          <img
            className="landing-feature-landscape"
            src="/images/aceternity-landscape.webp"
            alt=""
            width="1672"
            height="941"
            loading="lazy"
          />
          <div className="landing-feature-scene-shade" />
          <div className="landing-feature-card-position">
            <div className="landing-feature-card-shell">
              {landingFeatures.map((feature, index) => (
                <LandingFeatureCard key={feature.id} feature={feature} hidden={index !== activeIndex} />
              ))}
            </div>
          </div>
        </div>
        <div
          ref={tabListRef}
          className="landing-feature-tabs"
          data-feature={activeFeature.id}
          role="tablist"
          aria-label="Recursos do Orbit"
        >
          {landingFeatures.map((feature, index) => (
            <button
              key={feature.id}
              type="button"
              className="landing-feature-tab"
              role="tab"
              id={`${tabsId}-tab-${feature.id}`}
              aria-controls={`${tabsId}-panel-${feature.id}`}
              aria-selected={activeIndex === index}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <span className="landing-feature-tab-rule" aria-hidden="true" />
              {feature.label}
            </button>
          ))}
        </div>
        <div className="landing-feature-descriptions">
          {landingFeatures.map((feature, index) => (
            <div
              key={feature.id}
              className="landing-feature-panel"
              data-feature={feature.id}
              role="tabpanel"
              id={`${tabsId}-panel-${feature.id}`}
              aria-labelledby={`${tabsId}-tab-${feature.id}`}
              hidden={activeIndex !== index}
              tabIndex={0}
            >
              <p>{feature.description}</p>
              <ul className="sr-only">
                {feature.capabilities.map((capability) => (
                  <li key={capability.label}>
                    {capability.label}: {capability.detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="landing-feature-actions">
          <Button asChild variant="secondary" className="landing-action">
            <Link to="/login">
              Acessar workspace <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <a className="landing-feature-link" href="#produto">
            Explorar produto
          </a>
        </div>
      </div>
    </section>
  )
}
