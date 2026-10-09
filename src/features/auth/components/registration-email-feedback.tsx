import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors/app-error'
import { useResendRegistration, type useRegistrationEmail } from '../hooks/use-registration-email'

function PendingConfirmation({ email, destination }: { email: string; destination: string }) {
  const resend = useResendRegistration(email, destination)
  return <>
    <p className="field-help">Este e-mail já tem um cadastro aguardando confirmação. Use o link recebido para ativar sua conta.</p>
    {resend.isError && <p role="alert" className="field-error">{errorMessage(resend.error)}</p>}
    {resend.isSuccess ? <p role="status" className="field-help">Solicitação recebida. Confira sua caixa de entrada e o spam para encontrar o link de confirmação.</p>
      : <Button type="button" variant="outline" size="sm" disabled={resend.isPending} onClick={() => resend.mutate()}>
        {resend.isPending ? 'Solicitando confirmação…' : 'Reenviar confirmação'}
      </Button>}
  </>
}

export function RegistrationEmailFeedback({ check, destination, loginUrl }: {
  check: ReturnType<typeof useRegistrationEmail>; destination: string; loginUrl: string
}) {
  return <div id="signup-email-availability" className="form-field" aria-live="polite" aria-atomic="true">
    {check.checking ? <p className="field-help">Verificando e-mail…</p>
      : check.isError ? <>
        <p className="field-error">Não foi possível verificar este e-mail. {errorMessage(check.error)} Você também pode continuar e validar no envio.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void check.refetch()}>Verificar novamente</Button>
      </> : check.data === 'registered' ? <p className="field-error">Este e-mail já está cadastrado. <Link className="text-link" to={loginUrl}>Entrar na minha conta</Link></p>
        : check.data === 'confirmation_pending' ? <PendingConfirmation key={check.email} email={check.email} destination={destination} /> : null}
  </div>
}
