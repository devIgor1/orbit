import { ArrowUpRight } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { LoginForm } from '@/features/auth/components/login-form'
import { LoginStory } from '@/features/auth/components/login-story'
import { useAuth } from '@/features/auth/use-auth'
import { loginRedirectPath } from '@/features/auth/redirect-path'

export function LoginPage() {
  const { user, loading, error, configured } = useAuth()
  const location = useLocation()
  if (user && !loading) return <Navigate to={loginRedirectPath(location.state)} replace />

  return (
    <main className="login-page">
      <LoginStory />
      <section className="login-panel">
        <div className="login-form-header">
          <span className="eyebrow">BEM-VINDO AO ORBIT</span>
          <h2>
            Bom ter você
            <br /> por aqui.
          </h2>
          <p>Entre na sua conta e coloque suas ideias em movimento.</p>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error.message}
          </p>
        )}
        <LoginForm />
        {!configured && (
          <Link className="login-back" to="/dashboard">
            Explorar o workspace <ArrowUpRight />
          </Link>
        )}
        <span className="login-bottom-note">Menos ruído. Mais criação.</span>
      </section>
    </main>
  )
}
