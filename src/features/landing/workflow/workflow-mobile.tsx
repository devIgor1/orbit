import { FolderKanban } from 'lucide-react'
import type { WorkflowController } from '../hooks/use-workflow-canvas'
import { DESTINATIONS, INPUT_LABELS, SOURCES } from './workflow-metadata'
import { WorkflowDot } from './workflow-card'
import { TargetContents } from './workflow-target'

export function WorkflowMobile({ controller: c }: { controller: WorkflowController }) {
  return (
    <div className="workflow-mobile">
      <ul className="workflow-mobile-sources" aria-label="Entradas do projeto">
        {SOURCES.map(({ kind, title, icon: Icon, primary }) => <li key={kind}>
          <button type="button" className="workflow-mobile-source" data-kind={kind} aria-pressed={c.connected.includes(kind)}
            aria-label={`${c.connected.includes(kind) ? 'Desconectar' : 'Conectar'} ${INPUT_LABELS[kind]}`} onClick={() => c.toggle(kind)}>
            <span className="workflow-mobile-icon"><Icon aria-hidden="true" /></span>
            <span className="workflow-mobile-copy"><strong>{title}</strong><small>{primary}</small></span>
            <span className="workflow-mobile-state"><WorkflowDot active={c.connected.includes(kind)} />{c.connected.includes(kind) ? 'Conectado' : 'Conectar'}</span>
          </button>
        </li>)}
      </ul>
      <div className="workflow-mobile-connector" data-active={c.connected.length > 0} aria-hidden="true" />
      <div className="workflow-mobile-target" data-ready={c.ready}>
        <div className="workflow-card-header"><FolderKanban aria-hidden="true" /><strong>Projeto</strong><small>Orbit</small></div>
        <TargetContents connected={c.connected} ready={c.ready} pulse={c.pulse} />
      </div>
      <div className="workflow-mobile-connector" data-active={c.ready} aria-hidden="true" />
      <ul className="workflow-mobile-destinations" aria-label="Saídas do projeto">
        {DESTINATIONS.map(({ id, title, icon: Icon }) => <li key={id} data-active={c.ready}>
          <Icon aria-hidden="true" /><strong>{title}</strong><span><WorkflowDot active={c.ready} />{c.ready ? 'Ativo' : 'Aguardando'}</span>
        </li>)}
      </ul>
    </div>
  )
}
