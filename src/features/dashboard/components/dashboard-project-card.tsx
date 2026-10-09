import { ArrowUpRight, CalendarDays, FolderOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/lib/supabase/database.types'
import { formatDate } from '@/lib/format'

export function DashboardProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <Link to={`/projects/${project.id}`} className="dashboard-project-card">
      <div className="dashboard-project-card-top">
        <span className="project-glyph" data-tone={index % 4}>
          <FolderOpen aria-hidden="true" />
        </span>
        <Badge status={project.status} />
        <ArrowUpRight className="row-arrow" aria-hidden="true" />
      </div>
      <h3>{project.title}</h3>
      <p>{project.description || 'Adicione um contexto para orientar os próximos passos.'}</p>
      <div className="dashboard-project-deadline">
        <CalendarDays aria-hidden="true" />
        <span>
          {project.due_date
            ? `Entrega em ${formatDate(project.due_date, { day: 'numeric', month: 'short' })}`
            : 'Sem prazo definido'}
        </span>
      </div>
    </Link>
  )
}
