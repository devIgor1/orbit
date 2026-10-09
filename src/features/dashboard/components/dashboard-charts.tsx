import { ChartNoAxesCombined } from 'lucide-react'
import { EvolutionChart, DistributionChart } from '@/components/shared/chart'
import { SectionHeading } from '@/components/shared/section-heading'
import { EmptyState } from '@/components/shared/query-state'
import type { DashboardSummary } from '@/lib/supabase/database.types'
import { formatNumber } from '@/lib/format'

const statusNames: Record<string, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluídas',
}

export function DashboardEvolution({ data, days }: { data?: DashboardSummary; days: number }) {
  const created = data?.weekly.reduce((sum, day) => sum + day.created, 0)
  return (
    <section className="panel evolution-panel">
      <SectionHeading title="Ritmo de trabalho" description={`Criação e conclusão nos últimos ${days} dias`} />
      <div className="evolution-summary">
        <div>
          <strong>{data ? formatNumber(data.completed_tasks) : '—'}</strong>
          <span>tarefas concluídas no período</span>
        </div>
        <div className="chart-legend">
          <span data-series="created">Criadas</span>
          <span data-series="completed">Concluídas</span>
        </div>
      </div>
      {data ? (
        <EvolutionChart data={data.weekly} />
      ) : (
        <div className="chart-unavailable">
          <ChartNoAxesCombined />
          <h3>Seu ritmo, em perspectiva.</h3>
          <p>Conecte seu workspace para acompanhar a evolução.</p>
        </div>
      )}
      <div className="panel-footnote">
        <ChartNoAxesCombined aria-hidden="true" />
        {data
          ? `${formatNumber(created!)} tarefas criadas neste período. Cada avanço conta.`
          : 'Indicadores disponíveis após a conexão.'}
      </div>
    </section>
  )
}

export function DashboardDistribution({ data }: { data?: DashboardSummary }) {
  return (
    <section className="panel distribution-panel">
      <SectionHeading title="O trabalho, por etapa" description="Todas as tarefas do workspace" />
      {data && data.total_tasks > 0 ? (
        <DistributionChart data={data.distribution} total={data.total_tasks} />
      ) : data ? (
        <EmptyState title="Tudo pronto para começar" description="As etapas aparecem quando você cria tarefas." />
      ) : (
        <div className="distribution-placeholder">
          <span>—</span>
          <small>aguardando dados</small>
        </div>
      )}
      <div className="distribution-legend">
        {Object.entries(statusNames).map(([status, label]) => (
          <div key={status}>
            <span className="status-dot" data-status={status} />
            <span>{label}</span>
            <strong>
              {data ? formatNumber(data.distribution.find((item) => item.status === status)!.count) : '—'}
            </strong>
          </div>
        ))}
      </div>
    </section>
  )
}
