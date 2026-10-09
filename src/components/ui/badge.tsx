import type { ReactNode } from 'react'
const labels: Record<string, string> = {
  active: 'Em andamento',
  paused: 'Pausado',
  completed: 'Concluído',
  archived: 'Arquivado',
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluída',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  admin: 'Administrador',
  member: 'Membro',
}
export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return (
    <span className="ui-badge" data-status={status}>
      <span className="ui-badge-dot" />
      {children ?? labels[status] ?? status}
    </span>
  )
}
