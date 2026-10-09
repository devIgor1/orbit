import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { useMyInvitations } from '../hooks/use-companies'

export function IncomingInvitations({
  invitationId,
  busy,
  onAccept,
}: {
  invitationId: string | null
  busy: boolean
  onAccept: (id: string) => void
}) {
  const invitations = useMyInvitations()
  if (invitations.isPending) return <LoadingState label="Buscando seus convites…" />
  if (invitations.isError) return <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />
  const unavailable = invitationId && !invitations.data.some((item) => item.id === invitationId)
  return (
    <>
      {unavailable && (
        <p role="alert" className="form-error">
          Este convite não está disponível para sua conta. Entre com o e-mail convidado ou solicite um novo link ao
          administrador.
        </p>
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
      )}
    </>
  )
}
