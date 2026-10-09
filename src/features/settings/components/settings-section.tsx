import { useId, type ReactNode } from 'react'

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section className="settings-section" aria-labelledby={headingId}>
      <header className="settings-section-heading">
        <h2 id={headingId}>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="settings-section-content">{children}</div>
    </section>
  )
}
