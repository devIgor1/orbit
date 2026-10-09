import { CalendarDays, CheckCheck, ListTodo } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import type { Project, Task } from '@/lib/supabase/database.types'
import { projectStatusLabels } from '../schemas/project-schema'

export function ProjectSummary({ project, tasks }: { project: Project; tasks: Task[] }) {
  const completed = tasks.filter(task => task.status === 'done').length
  const percentage = tasks.length === 0 ? 0 : Math.round(completed / tasks.length * 100)

  return <section className="project-detail-summary" aria-label="Resumo do projeto">
    <div className="project-summary-meta">
      <Badge status={project.status}>{projectStatusLabels[project.status]}</Badge>
      <span><CalendarDays aria-hidden="true" />Entrega: {formatDate(project.due_date)}</span>
      <span><ListTodo aria-hidden="true" />{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
      <span><CheckCheck aria-hidden="true" />{completed} {completed === 1 ? 'concluída' : 'concluídas'}</span>
    </div>
    <div className="project-progress"><div><span>{tasks.length === 0 ? 'Nenhuma tarefa cadastrada' : 'Progresso do projeto'}</span>{tasks.length > 0 && <strong>{percentage}%</strong>}</div>{tasks.length > 0 && <Progress value={percentage} label="Progresso do projeto" />}</div>
  </section>
}
