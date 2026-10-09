import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { useMyInvitations } from '../hooks/use-companies'

export function IncomingInvitations({
  invitationId,
  accountEmail,
  busy,
  onAccept,
  onSwitchAccount,
}: {
  invitationId: string | null
  accountEmail: string | undefined
  busy: boolean
  onAccept: (id: string) => void
  onSwitchAccount: () => void
}) {
  const invitations = useMyInvitations()
  if (invitations.isPending) return <LoadingState label="Buscando seus convites…" />
  if (invitations.isError) return <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />
  const unavailable = invitationId && !invitations.data.some((item) => item.id === invitationId)
  return (
    <>
      {unavailable && !busy && (
        <div className="invitation-account-notice" role="alert">
          <p>
            <strong>O convite do link não está entre os convites pendentes desta conta.</strong>
          </p>
          {accountEmail && <p>Você está conectado como <strong>{accountEmail}</strong>.</p>}
          <p>Se o convite foi enviado para outro e-mail, entre com essa conta para continuar.</p>
          <Button variant="outline" disabled={busy} onClick={onSwitchAccount}>
            Entrar com outra conta
          </Button>
          <p>
            Se este é o e-mail correto, confira suas empresas abaixo: o convite pode já ter sido aceito.
            Se não encontrar a empresa, solicite um novo convite ao administrador.
          </p>
        </div>
      )}
      {invitations.data.length === 0 ? (
        <EmptyState
          title="Nenhum convite pendente"
          description="Recebeu um convite? Use a conta com o mesmo e-mail informado pela empresa. Atualize esta lista após receber um novo convite."
          action={
            <Button variant="outline" disabled={invitations.isFetching} onClick={() => void invitations.refetch()}>
              Atualizar convites
            </Button>
          }
        />
      ) : (
        <div className="incoming-invitation-list">
          {unavailable && <p className="field-help">Outros convites disponíveis para esta conta:</p>}
          <ul className="company-list">
            {invitations.data.map((invitation) => (
              <li className="company-list-row" data-highlighted={invitation.id === invitationId} key={invitation.id}>
                <div className="company-list-details">
                  <strong>{invitation.workspace_name}</strong>
                  <span>{invitation.email}</span>
                  <small>Acesso como colaborador</small>
                </div>
                <Button
                  disabled={busy}
                  onClick={() => onAccept(invitation.id)}
                  aria-label={`Aceitar convite de ${invitation.workspace_name}`}
                >
                  Aceitar convite
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
