import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Brand } from '@/components/layout/brand'
import { Button } from '@/components/ui/button'
import { ConnectionState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { useAuth } from '@/features/auth/use-auth'
import { signupDestination } from '@/features/auth/redirect-path'
import { AppError } from '@/lib/errors/app-error'

export function AuthConfirmationPage() {
  const auth = useAuth()
  const location = useLocation()
  const [params] = useSearchParams()
  const destination = signupDestination(params.get('next'))
  const fragment = new URLSearchParams(location.hash.slice(1))
  const invalidLink = fragment.has('error') || params.has('error')
  const error = invalidLink
    ? new AppError('authentication', 'Este link de confirmação expirou ou já foi utilizado. Entre na sua conta se já confirmou o e-mail ou refaça o cadastro para receber um novo link.')
    : auth.error

  if (auth.loading && !invalidLink) return <LoadingState label="Confirmando seu e-mail e preparando seu acesso…" />
  if (!auth.configured) return <ConnectionState />
  if (!error && auth.user) return <Navigate to={destination} replace />
  return (
    <main className="confirmation-page">
      <Brand />
      <div className="panel confirmation-panel">
        <ErrorState error={error ?? new AppError('authentication', 'Não foi possível iniciar sua sessão com este link. Entre com seu e-mail e senha para continuar.')} />
        <div className="confirmation-actions">
          <Button asChild><Link to={`/login?next=${encodeURIComponent(destination)}`}>Entrar na minha conta</Link></Button>
          <Button asChild variant="outline"><Link to={`/signup?next=${encodeURIComponent(destination)}`}>Voltar ao cadastro</Link></Button>
        </div>
      </div>
    </main>
  )
}
