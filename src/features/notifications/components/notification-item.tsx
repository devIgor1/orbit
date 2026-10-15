import { ArrowRight, Check, GitCompareArrows, MessageSquare, UserRoundPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { taskStatusLabels } from '@/features/tasks/schemas/task-schema'
import type { Notification } from '../schemas/notification-schema'

type Props = { item: Notification; pending: boolean; onOpen: () => void; onRead: () => void }

export function NotificationItem({ item, pending, onOpen, onRead }: Props) {
  const Icon = item.kind === 'assigned' ? UserRoundPlus : item.kind === 'commented' ? MessageSquare : GitCompareArrows
  const action = item.kind === 'assigned' ? 'atribuiu uma tarefa a você'
    : item.kind === 'commented' ? 'comentou na tarefa'
      : `moveu a tarefa para ${item.task_status ? taskStatusLabels[item.task_status] : 'outra etapa'}`
  return <li className="notification-item" data-unread={!item.read_at}>
    <span className="notification-event-icon"><Icon aria-hidden="true" /></span>
    <div className="notification-item-content">
      <p><strong>{item.actor_name}</strong> {action}.</p>
      <button type="button" className="notification-task-link" onClick={onOpen} disabled={pending}>
        <span>{item.task_title}</span><ArrowRight aria-hidden="true" />
      </button>
      <div className="notification-item-meta">
        <time dateTime={item.created_at}>{formatDate(item.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
        {!item.read_at && <span className="notification-unread-label">Não lida</span>}
      </div>
      {!item.read_at && <Button variant="ghost" size="sm" className="notification-read-action" disabled={pending} onClick={onRead}>
        <Check aria-hidden="true" />Marcar como lida
      </Button>}
    </div>
  </li>
}
