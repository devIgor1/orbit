import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ConnectionState, EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { PROJECTS_PAGE_SIZE, useProjects } from '@/features/projects/hooks/use-projects'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { ProjectCard } from '@/features/projects/components/project-card'
import { ProjectList } from '@/features/projects/components/project-list'
import { ProjectDialog } from '@/features/projects/components/project-dialog'
import { ProjectsToolbar } from '@/features/projects/components/projects-toolbar'
import { projectStatuses } from '@/features/projects/schemas/project-schema'

export function ProjectsPage() {
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const search = params.get('search') ?? ''
  const status = projectStatuses.find(value => value === params.get('status')) ?? 'all'
  const requestedPage = Number(params.get('page'))
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const projects = useProjects({ search, status: status === 'all' ? undefined : status, page })
  const workspace = useWorkspace()
  const canCreate = isSupabaseConfigured && workspace.isSuccess && workspace.data.role === 'admin'

  function setFilter(key: string, value: string) {
    setParams(current => {
      if (value && value !== 'all') current.set(key, value)
      else current.delete(key)
      if (key !== 'page') current.delete('page')
      return current
    }, { replace: true })
  }

  return (
    <div className="page-content">
      <PageHeader eyebrow="DA IDEIA À ENTREGA" title="Seus projetos" description="Grandes ideias merecem um lugar para acontecer." actions={<Button onClick={() => setCreating(true)} disabled={!canCreate} title={!canCreate ? 'Conecte um workspace com permissão de administrador para criar projetos.' : undefined}><Plus aria-hidden="true" />Novo projeto</Button>} />
      <nav className="section-tabs" aria-label="Filtrar projetos">
        <button type="button" data-active={status === 'all'} aria-pressed={status === 'all'} onClick={() => setFilter('status', 'all')}>Todos os projetos</button>
        <button type="button" data-active={status === 'active'} aria-pressed={status === 'active'} onClick={() => setFilter('status', 'active')}>Em andamento</button>
        <button type="button" data-active={status === 'completed'} aria-pressed={status === 'completed'} onClick={() => setFilter('status', 'completed')}>Concluídos</button>
        <button type="button" data-active={status === 'archived'} aria-pressed={status === 'archived'} onClick={() => setFilter('status', 'archived')}>Arquivados</button>
      </nav>
      <ProjectsToolbar search={search} status={status} view={view} onSearchChange={value => setFilter('search', value)} onStatusChange={value => setFilter('status', value)} onViewChange={setView} />
      {!isSupabaseConfigured ? <ConnectionState /> : workspace.isError ? <ErrorState error={workspace.error} onRetry={() => void workspace.refetch()} /> : projects.isError ? <ErrorState error={projects.error} onRetry={() => void projects.refetch()} /> : projects.isPending ? <LoadingState label="Buscando seus projetos…" /> : projects.data.items.length === 0 ? <EmptyState title={search ? 'Nenhum projeto encontrado' : 'Espaço para a sua próxima ideia'} description={search ? 'Experimente outro termo ou ajuste os filtros.' : 'Crie um projeto, reúna sua equipe e comece a construir algo especial.'} action={canCreate ? <Button onClick={() => setCreating(true)}><Plus aria-hidden="true" />Criar projeto</Button> : undefined} /> : <>
        {view === 'grid' ? <div className="projects-grid">{projects.data.items.map(project => <ProjectCard key={project.id} project={project} />)}</div> : <ProjectList projects={projects.data.items} />}
        <div className="pagination-bar">
          <span>{projects.data.total} {projects.data.total === 1 ? 'projeto' : 'projetos'} · Página {page}</span>
          <div className="pagination-actions"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}><ArrowLeft aria-hidden="true" />Anterior</Button><Button variant="outline" size="sm" disabled={page * PROJECTS_PAGE_SIZE >= projects.data.total} onClick={() => setFilter('page', String(page + 1))}>Próxima<ArrowRight aria-hidden="true" /></Button></div>
        </div>
      </>}
      <ProjectDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}
