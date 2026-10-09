import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProjects } from '@/features/projects/hooks/use-projects'
import { useAuth } from '@/features/auth/use-auth'
import { SectionHeading } from '@/components/shared/section-heading'
import { ConnectionState, EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { DashboardProjectCard } from './dashboard-project-card'

export function RecentProjects() {
  const { configured } = useAuth()
  const query = useProjects({ status: 'active', page: 1 })
  return (
    <section className="recent-projects">
      <SectionHeading
        title="Projetos em movimento"
        description="Os projetos ativos mais recentes."
        action={
          <Link className="text-link" to="/projects?status=active">
            Ver todos <ArrowUpRight />
          </Link>
        }
      />
      {!configured ? (
        <ConnectionState compact />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <LoadingState />
      ) : query.data.items.length === 0 ? (
        <EmptyState title="Qual será o próximo projeto?" description="Suas próximas criações vão aparecer por aqui." />
      ) : (
        <div className="dashboard-project-grid">
          {query.data.items.slice(0, 4).map((project, index) => (
            <DashboardProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}
    </section>
  )
}
