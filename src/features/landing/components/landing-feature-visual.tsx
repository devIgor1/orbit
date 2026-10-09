import { Activity, Check, CircleCheck, FolderKanban, ListTodo, UserRound } from 'lucide-react'
import type { LandingFeature } from '../landing-features'

// Original BuildSteps, ReplicaBars, RegionRoutes and TokenSpend arrangements
// adapted into capability diagrams: no invented quantities or workspace records.
export function LandingFeatureVisual({ feature }: { feature: LandingFeature }) {
  if (feature.id === 'projects')
    return (
      <ul className="landing-feature-build-steps">
        {feature.capabilities.map((item) => (
          <li key={item.label}>
            <span className="landing-feature-build-check">
              <Check />
            </span>
            <span>{item.label}</span>
            <small>{item.detail}</small>
          </li>
        ))}
      </ul>
    )

  if (feature.id === 'tasks')
    return (
      <ol className="landing-feature-task-stages">
        {feature.capabilities.map((item, index) => (
          <li key={item.label}>
            <span className="landing-feature-stage-column">
              <span>0{index + 1}</span>
            </span>
            <strong>{item.detail}</strong>
            <small>{item.label}</small>
          </li>
        ))}
      </ol>
    )

  if (feature.id === 'team')
    return (
      <ul className="landing-feature-team-routes">
        {feature.capabilities.map((item) => (
          <li key={item.label}>
            <span className="landing-feature-route-icon">
              <UserRound />
            </span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
            <Check />
          </li>
        ))}
      </ul>
    )

  const icons = [FolderKanban, CircleCheck, Activity]
  return (
    <div className="landing-feature-overview-visual">
      <div className="landing-feature-overview-band">
        <span />
        <span />
        <span />
      </div>
      <ul>
        {feature.capabilities.map((item, index) => {
          const Icon = icons[index] ?? ListTodo
          return (
            <li key={item.label}>
              <Icon />
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
