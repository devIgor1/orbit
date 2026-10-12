import { Link } from 'react-router-dom'
import { ExternalLink, GitBranch, GitPullRequest } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { formatDate } from '@/lib/format'
import type { Task } from '@/lib/supabase/database.types'
import { useGithubMutations, useGithubRepositories, useProjectGithub, useTaskGithub } from '../hooks/use-github'
import { githubError } from '../services/github-errors'
import { GithubLinkForm } from './github-link-form'

const states: Record<string, string> = {
  branch: 'Branch vinculada',
  draft: 'PR em rascunho',
  open: 'PR em revisão',
  closed: 'PR fechado sem merge',
  merged: 'PR integrado',
}
const comments: Record<string, string> = {
  not_due: 'O comentário será publicado após o merge.',
  pending: 'Comentário aguardando envio.',
  sent: 'Comentário publicado no PR.',
  error: 'Falha ao publicar o comentário. O envio será retomado automaticamente.',
}
export function TaskGithub({ task }: { task: Task }) {
  const link = useTaskGithub(task.id)
  const project = useProjectGithub(task.project_id)
  const repositories = useGithubRepositories()
  const mutations = useGithubMutations(task.project_id, task.id)
  if (link.isError) return <ErrorState error={link.error} onRetry={() => void link.refetch()} />
  if (project.isError) return <ErrorState error={project.error} onRetry={() => void project.refetch()} />
  if (repositories.isError) return <ErrorState error={repositories.error} onRetry={() => void repositories.refetch()} />
  if (link.isPending || project.isPending || repositories.isPending)
    return <LoadingState label="Buscando desenvolvimento…" />
  const repository = repositories.data.find((repo) => repo.id === project.data?.repository_id)
  if (!repository)
    return (
      <EmptyState
        title="Projeto sem repositório"
        description="Um administrador precisa vincular um repositório na página deste projeto."
      />
    )
  if (!repository.active)
    return (
      <EmptyState
        title="Conexão indisponível"
        description="Reconecte o repositório nas configurações para retomar a sincronização."
        action={
          <Button asChild variant="outline">
            <Link to="/settings">Abrir configurações</Link>
          </Button>
        }
      />
    )
  const data = link.data
  if (!data)
    return (
      <GithubLinkForm
        isPending={mutations.link.isPending}
        error={mutations.link.error}
        onSubmit={async (values) => {
          try {
            await mutations.link.mutateAsync({
              repositoryId: repository.id,
              ...(values.kind === 'branch' ? { branch: values.reference } : { prNumber: Number(values.reference) }),
            })
          } catch {
            /* Keep the edited values and show the mutation error. */
          }
        }}
      />
    )
  const repoUrl = `https://github.com/${repository.full_name}`
  const branchUrl =
    data.head_repository_id === repository.github_id
      ? `${repoUrl}/tree/${encodeURIComponent(data.branch)}`
      : `${repoUrl}/pull/${data.pr_number}`
  return (
    <section className="github-task" aria-label="Desenvolvimento da tarefa">
      {data.sync_status === 'error' || data.sync_status === 'unavailable' ? (
        <ErrorState error={githubError(data.last_error_code ?? 'GITHUB_FAILED')} />
      ) : (
        <p className="github-sync-status" role="status">
          {data.sync_status === 'pending'
            ? 'Sincronização agendada. Aguarde a confirmação do GitHub.'
            : states[data.pr_state]}
        </p>
      )}
      <a className="github-reference" href={branchUrl} target="_blank" rel="noreferrer">
        <GitBranch aria-hidden="true" />
        <span>
          {data.branch}
          {data.head_repository_id !== repository.github_id ? ' (fork — abrir PR)' : ''}
        </span>
        <ExternalLink aria-hidden="true" />
      </a>
      {data.pr_number && (
        <a className="github-reference" href={`${repoUrl}/pull/${data.pr_number}`} target="_blank" rel="noreferrer">
          <GitPullRequest aria-hidden="true" />
          <span>
            #{data.pr_number} {data.pr_title}
          </span>
          <ExternalLink aria-hidden="true" />
        </a>
      )}
      <p className="github-note">{comments[data.comment_status]}</p>
      {data.comment_id && data.pr_number && (
        <a
          className="text-link"
          target="_blank"
          rel="noreferrer"
          href={`${repoUrl}/pull/${data.pr_number}#issuecomment-${data.comment_id}`}
        >
          Ver comentário publicado
        </a>
      )}
      {data.last_synced_at && (
        <p className="github-note">
          Última confirmação:{' '}
          {formatDate(data.last_synced_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      {mutations.changeLink.isError && <ErrorState error={mutations.changeLink.error} />}
      <div className="github-task-actions">
        <Button
          variant="outline"
          disabled={mutations.changeLink.isPending}
          onClick={() => mutations.changeLink.mutate('retry')}
        >
          Sincronizar
        </Button>
        <Button
          variant="ghost"
          disabled={mutations.changeLink.isPending}
          onClick={() => mutations.changeLink.mutate('unlink')}
        >
          Remover vínculo
        </Button>
      </div>
      <p className="github-note">
        A remoção interrompe a automação desta tarefa. Comentários já publicados permanecem no GitHub.
      </p>
    </section>
  )
}
