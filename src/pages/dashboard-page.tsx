import { CalendarDays, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { ErrorState, LoadingState } from '@/components/shared/query-state'
import { useAuth } from '@/features/auth/use-auth'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard'
import { DashboardHero } from '@/features/dashboard/components/dashboard-hero'
import { DashboardMetrics } from '@/features/dashboard/components/dashboard-metrics'
import { DashboardEvolution, DashboardDistribution } from '@/features/dashboard/components/dashboard-charts'
import { RecentProjects } from '@/features/dashboard/components/recent-projects'
import { RecentActivity } from '@/features/dashboard/components/recent-activity'
import { ProjectDialog } from '@/features/projects/components/project-dialog'

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const days = params.get('period') === '30' ? 30 : 7
  const auth = useAuth()
  const workspace = useWorkspace()
  const dashboard = useDashboard(days)
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const canCreate = !auth.configured || workspace.data?.role === 'admin'
  const create = () => (auth.configured ? setCreateOpen(true) : navigate('/settings'))
  return (
    <div className="page-content dashboard-page">
      <PageHeader
        title="Visão geral"
        description="O que importa para o seu próximo passo."
        actions={
          <>
            <span className="period-picker">
              <CalendarDays />
              <Select
                aria-label="Período dos indicadores"
                value={days}
                onChange={(event) => setParams({ period: event.target.value })}
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
              </Select>
            </span>
            <Button
              onClick={create}
              disabled={!canCreate}
              title={!canCreate ? 'Somente administradores podem criar projetos.' : undefined}
            >
              <Plus />
              Novo projeto
            </Button>
          </>
        }
      />
      <DashboardHero name={workspace.data?.profile.full_name} workspaceName={workspace.data?.workspace.name} />
      {auth.configured && dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : auth.configured && dashboard.isPending ? (
        <LoadingState label="Organizando a visão do seu workspace…" />
      ) : (
        <DashboardMetrics data={dashboard.data} days={days} />
      )}
      <div className="dashboard-columns">
        <div className="dashboard-primary-column">
          <RecentProjects />
          {(!auth.configured || dashboard.isSuccess) && <DashboardEvolution data={dashboard.data} days={days} />}
        </div>
        <aside className="dashboard-secondary-column" aria-label="Etapas e atividade da equipe">
          {(!auth.configured || dashboard.isSuccess) && <DashboardDistribution data={dashboard.data} />}
          <RecentActivity />
        </aside>
      </div>
      <ProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
