import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { formatDate } from '@/lib/format'
import type { TeamMember } from '@/lib/supabase/database.types'
import { useTaskHistory } from '../hooks/use-tasks'

const actionLabels: Record<string, string> = { created: 'criou a tarefa', updated: 'atualizou a tarefa', commented: 'adicionou um comentário', status_changed: 'alterou o status', archived: 'arquivou o projeto' }

export function TaskHistory({ taskId, members }: { taskId: string; members: TeamMember[] }) {
  const history = useTaskHistory(taskId)
  if (history.isError) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />
  if (history.isPending) return <LoadingState label="Buscando histórico…" />
  if (history.data.length === 0) return <EmptyState title="Nenhuma atividade registrada" description="As próximas alterações aparecerão aqui." />
  return <ol className="activity-list">{history.data.map(event => {
    const author = members.find(member => member.id === event.actor_id)
    return <li className="activity-item" key={event.id}><span className="activity-dot" aria-hidden="true" /><div><p><strong>{author?.full_name ?? 'Membro do workspace'}</strong> {actionLabels[event.action] ?? 'registrou uma atualização'}</p><time dateTime={event.created_at}>{formatDate(event.created_at, { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</time></div></li>
  })}</ol>
}
