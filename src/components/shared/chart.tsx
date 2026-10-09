import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useChartGeometry } from './chart-geometry'

// Recharts owns measured SVG coordinates and tooltip positioning. All appearance
// references globals.css tokens; no measured layout is used for visual theming.
export function EvolutionChart({ data }: { data: { date: string; created: number; completed: number }[] }) {
  const geometry = useChartGeometry()
  return (
    <div className="evolution-chart" role="img" aria-label="Evolução de tarefas criadas e concluídas no período">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="completed-fill" x1="0" y1="0" x2="0" y2="1">
              <stop className="chart-gradient-start" offset="0%" />
              <stop className="chart-gradient-end" offset="100%" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
                new Date(`${String(value)}T12:00:00`),
              )
            }
            minTickGap={geometry.tickGap}
          />
          <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={geometry.axisWidth} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="chart-tooltip">
                  <strong>{String(label)}</strong>
                  {payload.map((entry) => (
                    <span key={String(entry.dataKey)}>
                      {entry.name}: {String(entry.value)}
                    </span>
                  ))}
                </div>
              ) : null
            }
          />
          <Area
            name="Criadas"
            type="monotone"
            dataKey="created"
            stroke="var(--chart-secondary)"
            fill="var(--chart-secondary-fill)"
            isAnimationActive={false}
          />
          <Area
            name="Concluídas"
            type="monotone"
            dataKey="completed"
            stroke="var(--primary)"
            fill="url(#completed-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
const colors: Record<string, string> = {
  todo: 'var(--status-todo)',
  in_progress: 'var(--primary)',
  review: 'var(--status-review)',
  done: 'var(--status-done)',
}
export function DistributionChart({ data, total }: { data: { status: string; count: number }[]; total: number }) {
  const geometry = useChartGeometry()
  return (
    <div className="distribution-chart">
      <div className="distribution-chart-ring" role="img" aria-label={`${total} tarefas distribuídas entre as etapas`}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={geometry.innerRadius}
              outerRadius={geometry.outerRadius}
              stroke="var(--surface)"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={colors[entry.status]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="distribution-chart-center">
          <strong>{total}</strong>
          <span>tarefas no total</span>
        </div>
      </div>
    </div>
  )
}
