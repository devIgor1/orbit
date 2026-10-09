import { Check } from 'lucide-react'

export function SetupSteps({ steps, current }: {
  steps: readonly { title: string; description: string }[]
  current: number
}) {
  return (
    <ol className="setup-steps" aria-label="Etapas de configuração">
      {steps.map((step, index) => (
        <li key={step.title} aria-current={index === current ? 'step' : undefined}
          data-state={index < current ? 'complete' : index === current ? 'current' : 'upcoming'}>
          <span className="setup-step-marker" aria-hidden="true">{index < current ? <Check /> : index + 1}</span>
          <span className="setup-step-copy">
            <strong>{step.title}</strong>
            <span>{step.description}</span>
            {index < current && <span className="sr-only">Etapa concluída</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
