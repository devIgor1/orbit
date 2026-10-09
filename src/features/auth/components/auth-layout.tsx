import type { ReactNode } from 'react'
import { LoginStory } from './login-story'

export function AuthLayout({
  eyebrow,
  title,
  description,
  variant = 'login',
  children,
}: {
  eyebrow: string
  title: string
  description: string
  variant?: 'login' | 'signup'
  children: ReactNode
}) {
  return (
    <main className="login-page" data-variant={variant}>
      <LoginStory />
      <section className="login-panel">
        <div className="login-form-header">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {children}
        {variant === 'login' && <span className="login-bottom-note">Menos ruído. Mais criação.</span>}
      </section>
    </main>
  )
}
