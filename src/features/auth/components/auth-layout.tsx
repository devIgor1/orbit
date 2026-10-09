import type { ReactNode } from 'react'
import { LoginStory } from './login-story'

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="login-page">
      <LoginStory />
      <section className="login-panel">
        <div className="login-form-header">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {children}
        <span className="login-bottom-note">Menos ruído. Mais criação.</span>
      </section>
    </main>
  )
}
