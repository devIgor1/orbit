import { CheckCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import type { useNotifications } from '../hooks/use-notifications'
import type { Notification } from '../schemas/notification-schema'
import { NotificationItem } from './notification-item'
import { LiveUpdateStatus } from '@/components/shared/live-update-status'
import type { useMyInvitations } from '@/features/companies/hooks/use-companies'
import { InvitationNotifications } from './invitation-notifications'

type Props = {
  state: ReturnType<typeof useNotifications>; unreadOnly: boolean; onFilter: (value: boolean) => void
  onClose: () => void; onOpen: (item: Notification) => void
  invitations: ReturnType<typeof useMyInvitations>; onOpenInvitation: (id?: string) => void
}

export function NotificationPanel({ state, invitations, onOpenInvitation, unreadOnly, onFilter, onClose, onOpen }: Props) {
  const { inbox, markRead, markAllRead, connection, reconnect } = state
  const error = markRead.error || markAllRead.error || inbox.error
  const page = inbox.isSuccess && !error ? inbox.data.pages[0] : undefined
  const pages = inbox.isSuccess && !error ? inbox.data.pages : undefined
  const pending = markRead.isPending || markAllRead.isPending
  function retry() {
    markRead.reset(); markAllRead.reset()
    void inbox.refetch()
  }
  return <>
    <header className="notification-panel-header">
      <div><span className="notification-eyebrow">SUA CONTA E WORKSPACE</span><h2 id="notifications-title">Notificações</h2></div>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar notificações"><X aria-hidden="true" /></Button>
    </header>
    <div className="notification-panel-body">
      <InvitationNotifications query={invitations} onOpen={onOpenInvitation} />
      <section aria-labelledby="workspace-notifications-title">
      <header className="notification-section-header"><h3 id="workspace-notifications-title">Atividades deste workspace</h3></header>
      <div className="notification-toolbar">
        <div className="notification-filters" role="group" aria-label="Filtrar notificações">
          <Button variant={unreadOnly ? 'ghost' : 'secondary'} size="sm" aria-pressed={!unreadOnly} onClick={() => onFilter(false)} disabled={pending}>Todas</Button>
          <Button variant={unreadOnly ? 'secondary' : 'ghost'} size="sm" aria-pressed={unreadOnly} onClick={() => onFilter(true)} disabled={pending}>Não lidas</Button>
        </div>
        <Button variant="ghost" size="sm" className="notification-mark-all" disabled={pending || !page || page.unread_count === 0}
          onClick={() => { if (page) markAllRead.mutate(page.as_of) }}><CheckCheck aria-hidden="true" />Marcar todas como lidas</Button>
      </div>
      <LiveUpdateStatus state={connection} onReconnect={reconnect} />
      <div aria-busy={pending || inbox.isFetching}>
        {error ? <ErrorState error={error} onRetry={retry} /> : !page || !pages ? <LoadingState label="Buscando suas notificações…" />
          : pages.every(part => part.items.length === 0) ? <EmptyState title={unreadOnly ? 'Tudo em dia por aqui'
            : invitations.isSuccess && invitations.data.length > 0 ? 'Nenhuma atividade por aqui' : 'Sua órbita está tranquila'}
            description={unreadOnly ? 'Você já leu todas as notificações.' : 'Atribuições, comentários e mudanças de etapa aparecerão aqui.'} />
            : <>
              <ul className="notification-list">
                {pages.flatMap(part => part.items).map(item => <NotificationItem key={item.id} item={item} pending={pending}
                  onOpen={() => onOpen(item)} onRead={() => markRead.mutate(item.id)} />)}
              </ul>
              {inbox.hasNextPage && <div className="notification-load-more"><Button variant="outline" size="sm" disabled={inbox.isFetching || pending}
                onClick={() => void inbox.fetchNextPage()}>{inbox.isFetchingNextPage ? 'Carregando…' : 'Carregar mais notificações'}</Button></div>}
            </>}
      </div>
      </section>
    </div>
    <footer className="notification-panel-footer">Atividades do workspace e convites para sua conta.</footer>
  </>
}
