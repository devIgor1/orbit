import { GripVertical, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCanvasPosition } from '@/lib/dom/canvas-coordinates'
import type { MoveHandlers, NodeId, Point } from './workflow-types'

export function MoveHeader({ title, icon: Icon, handlers, children }: {
  title: string; icon: LucideIcon; handlers: MoveHandlers; children?: ReactNode
}) {
  const { onKeyDown, ...pointer } = handlers
  return (
    <div className="workflow-card-header" {...pointer}>
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      {children}
      <button type="button" className="workflow-move-handle" aria-label={`Mover cartão ${title} com as setas`} onKeyDown={onKeyDown}>
        <GripVertical aria-hidden="true" />
      </button>
    </div>
  )
}

export function WorkflowCard({ id, title, icon, position, moving, handlers, dim, children }: {
  id: NodeId; title: string; icon: LucideIcon; position: Point; moving: boolean;
  handlers: MoveHandlers; dim?: boolean; children: ReactNode
}) {
  const ref = useCanvasPosition<HTMLDivElement>(position)
  return (
    <div ref={ref} className="workflow-card" data-node={id} data-moving={moving} data-dim={Boolean(dim)}>
      <MoveHeader title={title} icon={icon} handlers={handlers} />
      {children}
    </div>
  )
}

export function WorkflowMeta({ primary, secondary }: { primary: string; secondary: string }) {
  return <div className="workflow-card-meta"><span>{primary}</span><small>{secondary}</small></div>
}

export function WorkflowDot({ active = false }: { active?: boolean }) {
  return <span className="workflow-dot" data-active={active} aria-hidden="true" />
}
