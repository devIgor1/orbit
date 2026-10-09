import { ArrowUpRight } from 'lucide-react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { LoginForm } from '@/features/auth/components/login-form'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { useAuth } from '@/features/auth/use-auth'
import { loginRedirectPath, safeDestination, signupDestination } from '@/features/auth/redirect-path'
import { LoadingState } from '@/components/shared/query-state'

export function LoginPage() {
  const { user, loading, error, configured } = useAuth()
  const location = useLocation()
  const [params] = useSearchParams()
  const isSignupConfirmation = new URLSearchParams(location.hash.slice(1)).get('type') === 'signup'
  const destination = isSignupConfirmation ? signupDestination(params.get('next'))
    : params.has('next') ? safeDestination(params.get('next')) : loginRedirectPath(location.state)
  if (loading) return <LoadingState label="Preparando seu acesso…" />
  if (user && !loading) return <Navigate to={destination} replace />

  return (
    <AuthLayout eyebrow="BEM-VINDO AO ORBIT" title="Bom ter você por aqui." description="Entre na sua conta e coloque suas ideias em movimento.">
        {location.hash.includes('error=') && <p role="alert" className="form-error">O link de confirmação expirou ou é inválido. Faça o cadastro novamente para solicitar outro link.</p>}
        {error && (
          <p role="alert" className="form-error">
            {error.message}
          </p>
        )}
        <LoginForm destination={destination} />
        {!configured && (
          <Link className="login-back" to="/dashboard">
            Explorar o workspace <ArrowUpRight />
          </Link>
        )}
    </AuthLayout>
  )
}
