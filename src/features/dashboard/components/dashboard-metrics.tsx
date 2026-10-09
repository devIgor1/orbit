import { CircleCheck, Clock3, FolderKanban, Flag } from 'lucide-react'
import { MetricCard } from '@/components/shared/metric-card'
import type { DashboardSummary } from '@/lib/supabase/database.types'
export function DashboardMetrics({ data, days }: { data?: DashboardSummary; days: number }) {
  return (
    <section className="metrics-grid" aria-label="Indicadores do workspace">
      <MetricCard
        label="Projetos ativos"
        value={data?.active_projects}
        icon={FolderKanban}
        tone="brand"
        description={data ? 'Em andamento agora' : 'Aguardando conexão'}
      />
      <MetricCard
        label="Tarefas pendentes"
        value={data?.pending_tasks}
        icon={Clock3}
        tone="blue"
        description={data ? 'A fazer, em curso e revisão' : 'Aguardando conexão'}
      />
      <MetricCard
        label="Tarefas atrasadas"
        value={data?.overdue_tasks}
        icon={Flag}
        tone="amber"
        description={
          data ? (data.overdue_tasks ? 'Precisam de atenção' : 'Nenhuma tarefa atrasada') : 'Aguardando conexão'
        }
      />
      <MetricCard
        label="Tarefas concluídas"
        value={data?.completed_tasks}
        icon={CircleCheck}
        tone="green"
        description={data ? `Nos últimos ${days} dias` : 'Aguardando conexão'}
      />
    </section>
  )
}
