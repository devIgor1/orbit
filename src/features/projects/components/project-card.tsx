import { ArrowUpRight, CalendarDays, FolderKanban } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import type { Project } from '@/lib/supabase/database.types'
import { projectStatusLabels } from '../schemas/project-schema'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project-card" data-status={project.status}>
      <div className="project-card-top">
        <span className="project-symbol"><FolderKanban aria-hidden="true" /></span>
        <Badge status={project.status}>{projectStatusLabels[project.status]}</Badge>
      </div>
      <Link className="project-card-title" to={`/projects/${project.id}`}>
        <h2>{project.title}</h2><ArrowUpRight aria-hidden="true" />
      </Link>
      <p className="project-card-description">{project.description || 'Este projeto ainda não tem uma descrição.'}</p>
      <div className="project-card-footer">
        <span className="project-deadline"><CalendarDays aria-hidden="true" />{formatDate(project.due_date)}</span>
        <span className="project-card-meta">Criado em {formatDate(project.created_at)}</span>
      </div>
    </article>
  )
}
