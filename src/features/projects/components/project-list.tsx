import { Link } from 'react-router-dom'
import { FolderKanban } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/shared/data-table'
import { formatDate } from '@/lib/format'
import type { Project } from '@/lib/supabase/database.types'
import { projectStatusLabels } from '../schemas/project-schema'

export function ProjectList({ projects }: { projects: Project[] }) {
  return <DataTable rows={projects} getRowId={project => project.id} columns={[
    { id: 'title', header: 'Projeto', cell: project => <Link className="project-list-title" to={`/projects/${project.id}`}><span className="project-symbol"><FolderKanban aria-hidden="true" /></span><span>{project.title}</span></Link> },
    { id: 'status', header: 'Status', cell: project => <Badge status={project.status}>{projectStatusLabels[project.status]}</Badge> },
    { id: 'due_date', header: 'Entrega', cell: project => formatDate(project.due_date) },
    { id: 'created_at', header: 'Criado em', cell: project => formatDate(project.created_at) },
  ]} />
}
