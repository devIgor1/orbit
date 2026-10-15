import { useState } from 'react'
import { FolderKanban, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/shared/query-state'
import { formatDate } from '@/lib/format'
import { useTrashMutation } from '../hooks/use-trash'
import type { Trash, TrashKind } from '../services/trash-service'

const day = 24 * 60 * 60 * 1000
function remaining(purgeAt: string) {
  const days = Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / day))
  return days === 0 ? 'Será excluído hoje' : `Excluído definitivamente em ${days} ${days === 1 ? 'dia' : 'dias'}`
}

type Item = {
  id: string
  title: string
  deleted_at: string
  deleted_by: string | null
  purge_at: string
  detail: string
}

export function TrashList({ trash }: { trash: Trash }) {
  const change = useTrashMutation()
  const [confirming, setConfirming] = useState<string | null>(null)
  const busy = change.isPending
  if (!trash.projects.length && !trash.tasks.length)
    return (
      <EmptyState
        title="A lixeira está vazia"
        description="Projetos e tarefas excluídos ficam aqui por 15 dias antes de serem apagados definitivamente."
      />
    )
  const section = (kind: TrashKind, title: string, items: Item[]) =>
    items.length > 0 && (
      <section className="trash-section" aria-label={title}>
        <h2>
          {kind === 'project' ? <FolderKanban aria-hidden="true" /> : <ListTodo aria-hidden="true" />}
          {title}
        </h2>
        <ul className="trash-list">
          {items.map((item) => (
            <li className="trash-item" key={item.id}>
              <div className="trash-item-details">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <small>
                  Excluído {item.deleted_by ? `por ${item.deleted_by} ` : ''}em{' '}
                  {formatDate(item.deleted_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}{' '}
                  · {remaining(item.purge_at)}
                </small>
              </div>
              <div className="trash-item-actions">
                {confirming === item.id ? (
                  <>
                    <Button variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => change.mutate({ kind, action: 'purge', id: item.id })}
                    >
                      Excluir para sempre
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => change.mutate({ kind, action: 'restore', id: item.id })}
                      aria-label={`Restaurar ${item.title}`}
                    >
                      Restaurar
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirming(item.id)}
                      aria-label={`Excluir ${item.title} definitivamente`}
                    >
                      Excluir agora
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    )
  return (
    <div className="trash-content">
      {change.isError && <ErrorState error={change.error} />}
      {section(
        'project',
        'Projetos',
        trash.projects.map((project) => ({
          ...project,
          detail:
            project.task_count === 0
              ? 'Sem tarefas'
              : `${project.task_count} ${project.task_count === 1 ? 'tarefa' : 'tarefas'} junto com o projeto`,
        })),
      )}
      {section(
        'task',
        'Tarefas',
        trash.tasks.map((task) => ({ ...task, detail: `Projeto: ${task.project_title}` })),
      )}
    </div>
  )
}
