import type { ComponentProps } from 'react'
import { useCanvasPosition } from '@/lib/dom/canvas-coordinates'
import { WorkflowDot } from './workflow-card'
import type { Point } from './workflow-types'

type PortProps = ComponentProps<'button'> & {
  point: Point; kind: string; active: boolean; armed?: boolean; invalid?: boolean; side: 'input' | 'output'
}

export function WorkflowPort({ point, kind, active, armed, invalid, side, ...props }: PortProps) {
  const ref = useCanvasPosition<HTMLButtonElement>(point)
  return <button ref={ref} type="button" className="workflow-port" data-kind={kind} data-side={side}
    data-active={active} data-armed={Boolean(armed)} data-invalid={Boolean(invalid)} {...props}>
    <WorkflowDot active={active} />
  </button>
}

export function DecorativePort({ point, active }: { point: Point; active: boolean }) {
  const ref = useCanvasPosition<HTMLSpanElement>(point)
  return <span ref={ref} className="workflow-port workflow-port-static" aria-hidden="true"><WorkflowDot active={active} /></span>
}
