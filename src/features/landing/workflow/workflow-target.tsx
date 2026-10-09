import { Check, FolderKanban } from 'lucide-react'
import { useCanvasPosition } from '@/lib/dom/canvas-coordinates'
import { INPUT_LABELS, INPUTS } from './workflow-metadata'
import { MoveHeader, WorkflowDot } from './workflow-card'
import type { InputKind, MoveHandlers, Point } from './workflow-types'

type TargetContentsProps = { connected: InputKind[]; ready: boolean; pulse: { kind: InputKind; n: number } | null }

export function TargetContents({ connected, ready, pulse }: TargetContentsProps) {
  return (
    <>
      <div className="workflow-target-inputs">
        {pulse && <span key={pulse.n} className="workflow-target-pulse" data-kind={pulse.kind} aria-hidden="true" />}
        <ul>
          {INPUTS.map((kind) => <li key={kind} data-kind={kind} data-connected={connected.includes(kind)}>
            <span>{INPUT_LABELS[kind]}</span>
            {connected.includes(kind) && <Check aria-label="Conectado" />}
          </li>)}
        </ul>
      </div>
      <div className="workflow-target-footer">
        <WorkflowDot active={ready} />
        <span>{ready ? 'Fluxo completo' : `Aguardando entradas · ${connected.length}/4`}</span>
        {ready && <span className="workflow-ready-badge">Pronto</span>}
      </div>
    </>
  )
}

export function WorkflowTarget({ position, moving, handlers, ...props }: TargetContentsProps & {
  position: Point; moving: boolean; handlers: MoveHandlers
}) {
  const ref = useCanvasPosition<HTMLDivElement>(position)
  return (
    <div ref={ref} className="workflow-target" data-node="target" data-moving={moving} data-ready={props.ready}>
      <div className="workflow-target-surface">
        <MoveHeader title="Projeto" icon={FolderKanban} handlers={handlers}><small>Orbit</small></MoveHeader>
        <TargetContents {...props} />
      </div>
    </div>
  )
}
