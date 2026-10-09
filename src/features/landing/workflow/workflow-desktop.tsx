import type { WorkflowController } from '../hooks/use-workflow-canvas'
import { DESTINATIONS, INPUT_LABELS, INPUTS, SOURCES } from './workflow-metadata'
import { destinationInput, endpointOutput, inputPoint, outputPoint } from './workflow-geometry'
import { DragCable, IdleCable, StringCable } from './workflow-cables'
import { WorkflowCard, WorkflowMeta } from './workflow-card'
import { DecorativePort, WorkflowPort } from './workflow-ports'
import { WorkflowTarget } from './workflow-target'
import { WorkflowSpark } from './workflow-spark'

export function WorkflowDesktop({ controller: c }: { controller: WorkflowController }) {
  const { positions: p, geometry: g, wrapRef, stageRef, connected, ready, drag, hover, moving, moveHandlers, pulse, armed, portHandlers, inputClick } = c
  return (
    <div className="workflow-desktop" ref={wrapRef}>
      <div className="workflow-scaled-frame">
        <div className="workflow-stage" ref={stageRef} aria-label="Canvas de demonstração: conecte as entradas ao projeto">
          {p && g && <>
            <svg className="workflow-wires" viewBox={`0 0 ${g.width} ${g.height}`} aria-hidden="true">
              {SOURCES.filter(({ kind }) => connected.includes(kind)).map(({ kind }) =>
                <StringCable key={kind} kind={kind} from={outputPoint(p[kind], g)} to={inputPoint(kind, p.target, g)} />,
              )}
              {DESTINATIONS.map((destination, index) => ready
                ? <StringCable key={destination.id} from={endpointOutput(index, p.target, g)} to={destinationInput(p[destination.id], g)} />
                : <IdleCable key={destination.id} from={endpointOutput(index, p.target, g)} to={destinationInput(p[destination.id], g)} />,
              )}
              {drag?.moved && <DragCable from={outputPoint(p[drag.kind], g)} to={drag} kind={drag.kind} valid={Boolean(hover?.valid)} />}
              {drag?.moved && hover?.valid && <WorkflowSpark from={drag} to={inputPoint(drag.kind, p.target, g)} kind={drag.kind} />}
            </svg>
            {SOURCES.map((source) => <WorkflowCard key={source.kind} id={source.kind} title={source.title} icon={source.icon}
              position={p[source.kind]} moving={moving === source.kind} handlers={moveHandlers(source.kind)}>
              <WorkflowMeta primary={source.primary} secondary={source.secondary} />
              <div className="workflow-card-connection" data-kind={source.kind} data-connected={connected.includes(source.kind)}>
                <span>Saída</span><span>{connected.includes(source.kind) ? 'Conectado' : 'Puxe para conectar'}</span>
              </div>
            </WorkflowCard>)}
            <WorkflowTarget position={p.target} moving={moving === 'target'} handlers={moveHandlers('target')}
              ready={ready} connected={connected} pulse={pulse} />
            {DESTINATIONS.map((destination) => <WorkflowCard key={destination.id} id={destination.id}
              title={destination.title} icon={destination.icon} position={p[destination.id]} moving={moving === destination.id}
              handlers={moveHandlers(destination.id)} dim={!ready}>
              <WorkflowMeta primary={destination.primary} secondary={destination.secondary} />
              <div className="workflow-card-connection" data-active={ready}><span>Entrada</span><span>{ready ? 'Ativo' : 'Aguardando'}</span></div>
            </WorkflowCard>)}
            {SOURCES.map(({ kind }) => <WorkflowPort key={kind} point={outputPoint(p[kind], g)} kind={kind} side="output"
              active={connected.includes(kind) || drag?.kind === kind} armed={armed === kind}
              aria-label={`Selecionar conexão de ${INPUT_LABELS[kind]}`} aria-pressed={armed === kind}
              aria-describedby="workflow-instructions" {...portHandlers(kind)} />)}
            {INPUTS.map((kind) => <WorkflowPort key={kind} point={inputPoint(kind, p.target, g)} kind={kind} side="input"
              active={connected.includes(kind)} armed={armed === kind || (hover?.kind === kind && hover.valid)}
              invalid={hover?.kind === kind && !hover.valid}
              aria-label={`${connected.includes(kind) && !armed ? 'Desconectar' : 'Conectar'} ${INPUT_LABELS[kind]}${connected.includes(kind) && !armed ? '' : ' ao projeto'}`}
              tabIndex={connected.includes(kind) || armed ? 0 : -1} onClick={() => inputClick(kind)} />)}
            {DESTINATIONS.map((destination, index) => <DecorativePort key={`target-${destination.id}`} point={endpointOutput(index, p.target, g)} active={ready} />)}
            {DESTINATIONS.map((destination) => <DecorativePort key={destination.id} point={destinationInput(p[destination.id], g)} active={ready} />)}
          </>}
        </div>
      </div>
    </div>
  )
}
