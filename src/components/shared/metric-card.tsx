import type { LucideIcon } from 'lucide-react'
import { formatNumber } from '@/lib/format'
export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string
  value?: number
  description: string
  icon: LucideIcon
  tone: 'brand' | 'blue' | 'amber' | 'green'
}) {
  return (
    <article className="metric-card" data-tone={tone}>
      <div className="metric-card-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon />
        </span>
      </div>
      <strong className="metric-value">{value === undefined ? '—' : formatNumber(value)}</strong>
      <p>
        <span className="metric-indicator" />
        {description}
      </p>
    </article>
  )
}
