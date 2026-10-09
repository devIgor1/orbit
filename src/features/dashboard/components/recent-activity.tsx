import { ArrowUpRight, MessageSquare, Pencil, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/use-auth'
import { useActivity } from '@/features/dashboard/hooks/use-dashboard'
import { SectionHeading } from '@/components/shared/section-heading'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { formatDate } from '@/lib/format'
const actionNames: Record<string, string> = {
  created: 'Criado',
  updated: 'Atualizado',
  commented: 'Novo comentário',
  create: 'Criado',
  update: 'Atualizado',
  status_changed: 'Etapa atualizada',
}
export function RecentActivity() {
  const { configured } = useAuth()
  const query = useActivity(5)
  return (
    <section className="panel recent-activity">
      <SectionHeading title="Atividade da equipe" description="Os últimos movimentos, em contexto." />
      {!configured ? (
        <div className="query-state">
          <span className="state-icon">
            <MessageSquare />
          </span>
          <h3>Cada movimento conta.</h3>
          <p>As novidades da equipe vão aparecer aqui após a conexão.</p>
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <LoadingState />
      ) : query.data.length === 0 ? (
        <EmptyState title="Tudo pronto para começar" description="As atividades da equipe aparecerão aqui." />
      ) : (
        <ol className="dashboard-activity-list">
          {query.data.map((event) => (
            <li key={event.id}>
              <span className="activity-event-icon" data-action={event.action}>
                {event.entity_type === 'comment' ? (
                  <MessageSquare />
                ) : event.action === 'created' ? (
                  <Plus />
                ) : (
                  <Pencil />
                )}
              </span>
              <div>
                <p>
                  <strong>{event.title}</strong>
                </p>
                <span>
                  {actionNames[event.action] ?? 'Atividade registrada'} ·{' '}
                  {formatDate(event.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {event.project_id && (
                <Link to={`/projects/${event.project_id}`} aria-label={`Abrir projeto de ${event.title}`}>
                  <ArrowUpRight />
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
