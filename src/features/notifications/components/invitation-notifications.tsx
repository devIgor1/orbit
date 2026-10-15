import { ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingState } from '@/components/shared/query-state'
import { LiveUpdateStatus } from '@/components/shared/live-update-status'
import { formatDate } from '@/lib/format'
import type { useMyInvitations } from '@/features/companies/hooks/use-companies'

export function InvitationNotifications({ query, onOpen }: {
  query: ReturnType<typeof useMyInvitations>; onOpen: (id?: string) => void
}) {
  const empty = query.isSuccess && query.data.length === 0
  if (empty && query.connection === 'connected') return null
  return <section className="notification-invitations" aria-labelledby="invitation-notifications-title">
    <header className="notification-section-header">
      <h3 id="invitation-notifications-title">Convites para você</h3>
      <p>De todas as empresas · pendentes de aceitação</p>
    </header>
    <LiveUpdateStatus state={query.connection} onReconnect={query.reconnect} subject="Convites" />
    {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      : query.isPending ? <LoadingState label="Buscando seus convites…" />
        : <>
          <ul className="notification-list">
            {query.data.slice(0, 3).map(invitation => <li className="notification-invitation-item" key={invitation.id}>
              <span className="notification-event-icon"><Mail aria-hidden="true" /></span>
              <div className="notification-item-content">
                <p>Você recebeu um convite para</p>
                <button type="button" className="notification-task-link" onClick={() => onOpen(invitation.id)}
                  aria-label={`Ver convite de ${invitation.workspace_name}`}>
                  <span>{invitation.workspace_name}</span><ArrowRight aria-hidden="true" />
                </button>
                <div className="notification-item-meta">
                  <span>Pendente</span><span>Válido até <time dateTime={invitation.expires_at}>
                    {formatDate(invitation.expires_at, { day: '2-digit', month: 'short' })}
                  </time></span>
                </div>
              </div>
            </li>)}
          </ul>
          {query.data.length > 3 && <div className="notification-load-more"><Button variant="outline" size="sm" onClick={() => onOpen()}>
            Ver todos os {query.data.length} convites
          </Button></div>}
        </>}
  </section>
}
