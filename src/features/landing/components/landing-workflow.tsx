import { Button } from '@/components/ui/button'
import { RotateCcw, Unplug } from 'lucide-react'
import { useWorkflowCanvas } from '../hooks/use-workflow-canvas'
import { WorkflowDesktop } from '../workflow/workflow-desktop'
import { WorkflowMobile } from '../workflow/workflow-mobile'
import { LandingSectionHeading } from './landing-section-heading'

// Adapted from the licensed Aceternity Inference Workflows canvas. This local
// demonstration explains relationships without reading or writing business data.
export function LandingWorkflow() {
  const controller = useWorkflowCanvas()
  return (
    <section id="como-funciona" className="landing-section landing-workflow workflow-canvas"
      aria-labelledby="landing-workflow-title" data-ready={controller.ready}
      onKeyDown={(event) => { if (event.key === 'Escape') controller.cancel() }}>
      <div className="landing-container">
        <LandingSectionHeading id="landing-workflow-title"
          description="Conecte briefing, tarefas, equipe e prazos. Veja como cada parte se encontra em um projeto."
          actions={<div className="workflow-actions">
            <Button variant="ghost" onClick={controller.reset}><RotateCcw aria-hidden="true" />Reiniciar conexões</Button>
            <Button variant="outline" onClick={controller.connectAll} disabled={controller.ready}><Unplug aria-hidden="true" />Conectar tudo</Button>
          </div>}>
          Conecte as ideias. Dê forma à entrega.
        </LandingSectionHeading>
      </div>
      <div className="workflow-interactive">
        <WorkflowDesktop controller={controller} />
        <WorkflowMobile controller={controller} />
      </div>
      <div className="landing-container workflow-caption">
        <p id="workflow-instructions"><span className="workflow-desktop-instruction">Arraste os cartões e puxe os pontos para conectar. Pelo teclado, selecione uma saída e sua entrada correspondente; use as setas para mover cartões.</span><span className="workflow-mobile-instruction">Toque nas entradas para conectar ou desconectar cada parte do projeto.</span></p>
        <p className="workflow-disclaimer">Demonstração interativa · nenhuma alteração no seu workspace.</p>
        <p className="workflow-live-status" role="status" aria-live="polite" aria-atomic="true">{controller.status}</p>
      </div>
    </section>
  )
}
