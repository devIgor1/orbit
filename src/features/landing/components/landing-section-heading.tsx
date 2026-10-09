import type { ReactNode } from 'react'

type LandingSectionHeadingProps = {
  id?: string
  children: ReactNode
  description?: string
  actions?: ReactNode
}

export function LandingSectionHeading({
  id,
  children,
  description,
  actions,
}: LandingSectionHeadingProps) {
  return (
    <header className="landing-section-heading">
      <div className="landing-section-copy">
        <h2 id={id} className="landing-template-heading">{children}</h2>
        {description && <p className="landing-section-description">{description}</p>}
      </div>
      {actions && <div className="landing-section-aside">{actions}</div>}
    </header>
  )
}
