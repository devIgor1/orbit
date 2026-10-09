import { useState } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { formatDate } from '@/lib/format'
import { useMemberEvents } from '../hooks/use-member-management'
import { MEMBER_EVENTS_PAGE_SIZE } from '../services/member-management-service'
import { memberRoleLabels } from '../schemas/member-management-schema'

function HistoryContent() {
  const [page, setPage] = useState(0)
  const events = useMemberEvents(page)
  if (events.isError) return <ErrorState error={events.error} onRetry={() => void events.refetch()} />
  if (events.isPending) return <LoadingState label="Carregando alterações de acesso…" />
  if (events.data.total === 0) return <EmptyState title="Nenhuma alteração de acesso" description="Alterações de permissão e remoções realizadas a partir de agora aparecerão aqui." />
  return <div className="member-access-history">
    <ol className="activity-list">{events.data.events.map(event => <li key={event.id} className="activity-item">
      <span className="activity-dot" aria-hidden="true" /><div>
        <p><strong>{event.actor_name}</strong> {event.action === 'removed' ? 'removeu' : 'alterou o acesso de'} <strong>{event.member_name}</strong>.</p>
        {event.action === 'role_changed' && event.new_role && <p>{memberRoleLabels[event.previous_role]} → {memberRoleLabels[event.new_role]}</p>}
        {event.action === 'removed' && <p>{event.affected_tasks} {event.affected_tasks === 1 ? 'tarefa pendente' : 'tarefas pendentes'}: {event.reassigned_name ? `${event.affected_tasks === 1 ? 'transferida' : 'transferidas'} para ${event.reassigned_name}` : 'sem responsável'}.</p>}
        <time dateTime={event.created_at}>{formatDate(event.created_at, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
      </div>
    </li>)}</ol>
    <div className="member-history-pagination" aria-label="Paginação do histórico">
      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Anterior</Button>
      <span>Página {page + 1} de {Math.ceil(events.data.total / MEMBER_EVENTS_PAGE_SIZE)}</span>
      <Button variant="outline" size="sm" disabled={(page + 1) * MEMBER_EVENTS_PAGE_SIZE >= events.data.total} onClick={() => setPage(value => value + 1)}>Próxima</Button>
    </div>
  </div>
}

export function MemberAccessHistory() {
  const [open, setOpen] = useState(false)
  return <Dialog open={open} onOpenChange={setOpen} title="Histórico de acessos" description="Alterações de permissão e remoções da empresa, com autor e data."
    trigger={<Button variant="outline"><History />Histórico de acessos</Button>}>
    {open && <HistoryContent />}
  </Dialog>
}
