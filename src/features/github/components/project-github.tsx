import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GitFork } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionsSelect } from '@/components/shared/options-select'
import { ErrorState, LoadingState } from '@/components/shared/query-state'
import { useGithubMutations, useGithubRepositories, useProjectGithub } from '../hooks/use-github'

export function ProjectGithub({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const repositories = useGithubRepositories()
  const project = useProjectGithub(projectId)
  const { setProject } = useGithubMutations(projectId)
  const [selected, setSelected] = useState('')
  if (repositories.isError) return <ErrorState error={repositories.error} onRetry={() => void repositories.refetch()} />
  if (project.isError) return <ErrorState error={project.error} onRetry={() => void project.refetch()} />
  if (repositories.isPending || project.isPending) return <LoadingState label="Buscando integração do projeto…" />
  const current = repositories.data.find((repo) => repo.id === project.data?.repository_id)
  const options = repositories.data
    .filter((repo) => repo.active)
    .map((repo) => ({ value: repo.id, label: repo.full_name }))
  const value = selected || current?.id || ''
  return (
    <section className="github-project panel" aria-label="Repositório do projeto">
      <div className="github-project-heading">
        <GitFork aria-hidden="true" />
        <div>
          <h2>Desenvolvimento</h2>
          <p className="github-note">
            {current
              ? `${current.full_name}${current.active ? '' : ' · acesso indisponível'}`
              : 'Conecte o trabalho da equipe às entregas no GitHub.'}
          </p>
        </div>
      </div>
      {canManage && options.length > 0 && (
        <div className="github-project-actions">
          <OptionsSelect
            aria-label="Repositório do projeto"
            value={value}
            items={[{ value: '', label: 'Selecionar repositório' }, ...options]}
            onValueChange={setSelected}
            disabled={setProject.isPending}
          />
          <Button
            variant="outline"
            disabled={!value || value === current?.id || setProject.isPending}
            onClick={() => setProject.mutate(value)}
          >
            {setProject.isPending ? 'Salvando…' : 'Vincular'}
          </Button>
        </div>
      )}
      {!current && options.length === 0 && (
        <Link className="text-link" to="/settings">
          Configurar GitHub
        </Link>
      )}
      {setProject.isError && <ErrorState error={setProject.error} />}
      {canManage && current && (
        <p className="github-note">Para trocar o repositório, remova primeiro os vínculos das tarefas.</p>
      )}
    </section>
  )
}
