import { CheckCheck, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import type { useNotifications } from '../hooks/use-notifications'
import type { Notification } from '../schemas/notification-schema'
import { NotificationItem } from './notification-item'

type Props = {
  state: ReturnType<typeof useNotifications>; unreadOnly: boolean; onFilter: (value: boolean) => void
  onClose: () => void; onOpen: (item: Notification) => void
}

export function NotificationPanel({ state, unreadOnly, onFilter, onClose, onOpen }: Props) {
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
      <div><span className="notification-eyebrow">SEU WORKSPACE</span><h2 id="notifications-title">Notificações</h2></div>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar notificações"><X aria-hidden="true" /></Button>
    </header>
    <div className="notification-toolbar">
      <div className="notification-filters" role="group" aria-label="Filtrar notificações">
        <Button variant={unreadOnly ? 'ghost' : 'secondary'} size="sm" aria-pressed={!unreadOnly} onClick={() => onFilter(false)} disabled={pending}>Todas</Button>
        <Button variant={unreadOnly ? 'secondary' : 'ghost'} size="sm" aria-pressed={unreadOnly} onClick={() => onFilter(true)} disabled={pending}>Não lidas</Button>
      </div>
      <Button variant="ghost" size="sm" className="notification-mark-all" disabled={pending || !page || page.unread_count === 0}
        onClick={() => { if (page) markAllRead.mutate(page.as_of) }}><CheckCheck aria-hidden="true" />Marcar todas como lidas</Button>
    </div>
    {connection !== 'connected' && <div className="notification-connection" role="status">
      <span>{connection === 'connecting' ? 'Conectando atualizações ao vivo…' : 'Atualizações ao vivo indisponíveis. A lista será consultada periodicamente.'}</span>
      {connection === 'disconnected' && <Button variant="ghost" size="sm" onClick={reconnect}><RefreshCw aria-hidden="true" />Reconectar</Button>}
    </div>}
    <div className="notification-panel-body" aria-busy={pending || inbox.isFetching}>
      {error ? <ErrorState error={error} onRetry={retry} /> : !page || !pages ? <LoadingState label="Buscando suas notificações…" />
        : pages.every(part => part.items.length === 0) ? <EmptyState title={unreadOnly ? 'Tudo em dia por aqui' : 'Sua órbita está tranquila'}
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
    <footer className="notification-panel-footer">Avisos da equipe, no seu tempo.</footer>
  </>
}
