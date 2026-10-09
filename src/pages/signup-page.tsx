import { Navigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '@/features/auth/components/auth-layout'
import { SignupForm } from '@/features/auth/components/signup-form'
import { useAuth } from '@/features/auth/use-auth'
import { signupDestination } from '@/features/auth/redirect-path'
import { LoadingState } from '@/components/shared/query-state'

export function SignupPage() {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const destination = signupDestination(params.get('next'))
  if (loading) return <LoadingState label="Preparando seu cadastro…" />
  if (user) return <Navigate to={destination} replace />
  return (
    <AuthLayout
      variant="signup"
      eyebrow="SEU PRÓXIMO PROJETO COMEÇA AQUI"
      title="Entre para a sua próxima órbita."
      description="Crie sua conta para organizar sua empresa ou fazer parte de uma equipe."
    >
      <SignupForm destination={destination} />
    </AuthLayout>
  )
}
