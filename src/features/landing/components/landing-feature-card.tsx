import type { LandingFeature } from '../landing-features'
import { LandingFeatureVisual } from './landing-feature-visual'

export function LandingFeatureCard({ feature, hidden }: { feature: LandingFeature; hidden: boolean }) {
  return (
    <div className="landing-feature-capability-card" data-feature={feature.id} hidden={hidden}>
      <div className="landing-feature-card-heading">
        <p>{feature.card.label}</p>
        <span className="landing-feature-card-badge" data-tone={feature.card.tone}>
          <span />
          {feature.card.status}
        </span>
      </div>
      <h3>{feature.card.title}</h3>
      <div className="landing-feature-card-visual">
        <LandingFeatureVisual feature={feature} />
      </div>
      <p className="landing-feature-card-meta">{feature.card.meta}</p>
    </div>
  )
}
