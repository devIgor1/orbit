import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Archive, ArrowLeft, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ConnectionState, EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import type { Task } from '@/lib/supabase/database.types'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { useProject } from '@/features/projects/hooks/use-projects'
import { ProjectDialog } from '@/features/projects/components/project-dialog'
import { ArchiveProjectDialog } from '@/features/projects/components/archive-project-dialog'
import { ProjectSummary } from '@/features/projects/components/project-summary'
import { useTasks, useTaskMutations } from '@/features/tasks/hooks/use-tasks'
import { useTeam } from '@/features/team/hooks/use-team'
import { TaskBoard } from '@/features/tasks/components/task-board'
import { TaskList } from '@/features/tasks/components/task-list'
import { TaskDialog } from '@/features/tasks/components/task-dialog'
import { TaskSheet } from '@/features/tasks/components/task-sheet'
import { TasksToolbar } from '@/features/tasks/components/tasks-toolbar'

export function ProjectPage() {
  const { projectId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [editing, setEditing] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [initialStatus, setInitialStatus] = useState<Task['status']>('todo')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const project = useProject(projectId)
  const tasks = useTasks(projectId)
  const team = useTeam()
  const workspace = useWorkspace()
  const { updateTask } = useTaskMutations(projectId)
  const search = params.get('search') ?? ''
  const rawPriority = params.get('priority')
  const priority = rawPriority === 'low' || rawPriority === 'medium' || rawPriority === 'high' ? rawPriority : 'all'
  const canManage = workspace.isSuccess && workspace.data.role === 'admin'
  const ready = isSupabaseConfigured && project.isSuccess && !project.isError && team.isSuccess && !team.isError && tasks.isSuccess && !tasks.isError

  function setFilter(key: string, value: string) {
    setParams(current => {
      if (value && value !== 'all') current.set(key, value)
      else current.delete(key)
      return current
    }, { replace: true })
  }
  function create(status: Task['status'] = 'todo') { setInitialStatus(status); setCreating(true) }
  function changeStatus(task: Task, status: Task['status']) { updateTask.mutate({ id: task.id, status }) }

  const filteredTasks = tasks.isSuccess && !tasks.isError ? tasks.data.filter(task => task.title.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) && (priority === 'all' || task.priority === priority)) : undefined
  const selected = tasks.isSuccess && !tasks.isError ? tasks.data.find(task => task.id === selectedId) : undefined

  return <div className="page-content">
    <Link to="/projects" className="project-back-link"><ArrowLeft aria-hidden="true" />Todos os projetos</Link>
    <PageHeader eyebrow="CADA ETAPA CONTA" title={project.isSuccess && !project.isError ? project.data.title : 'Detalhes do projeto'} description={project.isSuccess && !project.isError ? project.data.description || 'Organize os próximos passos e crie em equipe.' : 'Ideias em movimento. Equipe em sintonia.'} actions={<div className="page-actions">
      {canManage && project.isSuccess && <><Button variant="outline" size="icon" aria-label="Editar projeto" onClick={() => setEditing(true)}><Pencil aria-hidden="true" /></Button>{project.data.status !== 'archived' && <Button variant="outline" size="icon" aria-label="Arquivar projeto" onClick={() => setArchiving(true)}><Archive aria-hidden="true" /></Button>}</>}
      <Button disabled={!ready} onClick={() => create()}><Plus aria-hidden="true" />Nova tarefa</Button>
    </div>} />
    {project.isSuccess && !project.isError && tasks.isSuccess && !tasks.isError && <ProjectSummary project={project.data} tasks={tasks.data} />}
    <div className="board-header"><h2>Tarefas do projeto</h2><p>Um passo de cada vez, todos na mesma direção.</p></div>
    <TasksToolbar search={search} priority={priority} view={view} onSearchChange={value => setFilter('search', value)} onPriorityChange={value => setFilter('priority', value)} onViewChange={setView} />
    {!isSupabaseConfigured ? <ConnectionState /> : workspace.isError ? <ErrorState error={workspace.error} onRetry={() => void workspace.refetch()} /> : project.isError ? <ErrorState error={project.error} onRetry={() => void project.refetch()} /> : tasks.isError ? <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} /> : team.isError ? <ErrorState error={team.error} onRetry={() => void team.refetch()} /> : !ready || !filteredTasks || !team.data ? <LoadingState label="Preparando seu quadro…" /> : <>
      {updateTask.isError && <ErrorState error={updateTask.error} onRetry={() => updateTask.reset()} />}
      {filteredTasks.length === 0 && (search || priority !== 'all') ? <EmptyState title="Nenhuma tarefa encontrada" description="Experimente uma nova busca ou ajuste a prioridade." /> : view === 'board' ? <TaskBoard tasks={filteredTasks} members={team.data} isPending={updateTask.isPending} onOpen={task => setSelectedId(task.id)} onCreate={create} onStatusChange={changeStatus} /> : filteredTasks.length === 0 ? <EmptyState title="Seu próximo passo começa aqui" description="Adicione a primeira tarefa e dê vida ao seu projeto." action={<Button onClick={() => create()}><Plus aria-hidden="true" />Criar tarefa</Button>} /> : <TaskList tasks={filteredTasks} members={team.data} isPending={updateTask.isPending} onOpen={task => setSelectedId(task.id)} onStatusChange={changeStatus} />}
      <TaskDialog open={creating} projectId={projectId} members={team.data} initialStatus={initialStatus} onOpenChange={setCreating} />
      {selected && <TaskSheet key={selected.id} task={selected} members={team.data} onClose={() => setSelectedId(null)} />}
    </>}
    {project.isSuccess && !project.isError && <><ProjectDialog open={editing} onOpenChange={setEditing} project={project.data} /><ArchiveProjectDialog open={archiving} onOpenChange={setArchiving} project={project.data} /></>}
  </div>
}
