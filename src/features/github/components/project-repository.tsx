import { useId } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, GitFork } from 'lucide-react'
import { OptionsSelect } from '@/components/shared/options-select'
import { ErrorState, LoadingState } from '@/components/shared/query-state'
import { useGithubRepositories } from '../hooks/use-github'
import { useProjectRepository, useProjectRepositoryMutation } from '../hooks/use-project-repository'
import { githubError } from '../services/github-errors'

const none = 'none'

/** Repository whose PRs the tasks of this project can link. */
export function ProjectRepository({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const id = useId()
  const repositories = useGithubRepositories()
  const linked = useProjectRepository(projectId)
  const change = useProjectRepositoryMutation(projectId)
  const content = repositories.isError ? (
    <ErrorState error={repositories.error} onRetry={() => void repositories.refetch()} />
  ) : linked.isError ? (
    <ErrorState error={linked.error} onRetry={() => void linked.refetch()} />
  ) : repositories.isPending || linked.isPending ? (
    <LoadingState label="Buscando repositório…" />
  ) : null
  const current = repositories.data?.find((repository) => repository.id === linked.data)
  const available = repositories.data?.filter((repository) => repository.active) ?? []
  return (
    <section className="project-repository" aria-labelledby={`${id}-title`}>
      <div className="project-repository-header">
        <GitFork aria-hidden="true" />
        <h2 id={`${id}-title`}>Repositório do GitHub</h2>
      </div>
      {content ?? (
        <>
          {current ? (
            <a
              className="github-reference"
              href={`https://github.com/${current.full_name}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>{current.full_name}</span>
              <ExternalLink aria-hidden="true" />
            </a>
          ) : (
            <p className="github-note">
              {canManage
                ? 'Escolha o repositório deste projeto. As tarefas vinculam PRs apenas dele.'
                : 'Este projeto ainda não tem repositório. Um administrador pode vinculá-lo.'}
            </p>
          )}
          {current && !current.active && <ErrorState error={githubError('GITHUB_UNAVAILABLE')} />}
          {canManage &&
            (available.length === 0 && !current ? (
              <p className="github-note">
                Nenhum repositório conectado à empresa.{' '}
                <Link className="text-link" to="/settings">
                  Conecte nas configurações
                </Link>
                .
              </p>
            ) : (
              <div className="form-field">
                <label htmlFor={`${id}-repository`}>{current ? 'Trocar repositório' : 'Repositório'}</label>
                <OptionsSelect
                  id={`${id}-repository`}
                  value={linked.data ?? none}
                  disabled={change.isPending}
                  onValueChange={(value) => {
                    if (value !== (linked.data ?? none)) change.mutate(value === none ? null : value)
                  }}
                  items={[
                    { value: none, label: 'Sem repositório' },
                    ...available.map((repository) => ({ value: repository.id, label: repository.full_name })),
                    ...(current && !current.active
                      ? [{ value: current.id, label: current.full_name, disabled: true }]
                      : []),
                  ]}
                />
              </div>
            ))}
          {change.isError && <ErrorState error={change.error} />}
        </>
      )}
    </section>
  )
}
