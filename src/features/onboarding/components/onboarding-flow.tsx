import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { SetupSteps } from '@/components/shared/setup-steps'
import { ErrorState, LoadingState } from '@/components/shared/query-state'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { AppError } from '@/lib/errors/app-error'
import { CompanyStep } from './company-step'
import { TeamStep } from './team-step'

const steps = [
  { title: 'Adicionar uma empresa', description: 'Dê um lugar às suas ideias.' },
  { title: 'Convidar equipe', description: 'Traga quem vai criar com você.' },
] as const

export function OnboardingFlow({ onFinish }: { onFinish: () => void }) {
  const workspace = useWorkspace()
  const heading = useRef<HTMLHeadingElement>(null)
  const needsCompany = workspace.isError && workspace.error instanceof AppError && workspace.error.kind === 'onboarding'
  const step = workspace.isSuccess ? 1 : 0
  useEffect(() => {
    if (workspace.isSuccess || needsCompany) heading.current?.focus()
  }, [step, workspace.isSuccess, needsCompany])

  if (workspace.isPending) return <LoadingState label="Preparando sua configuração…" />
  if (workspace.isError && !needsCompany)
    return <ErrorState error={workspace.error} onRetry={() => void workspace.refetch()} />
  if (workspace.isSuccess && workspace.data.role !== 'admin') return <Navigate to="/dashboard" replace />
  return (
    <div className="onboarding-grid">
      <aside className="onboarding-intro">
        <span className="eyebrow">BEM-VINDO À SUA PRÓXIMA ÓRBITA</span>
        <h1>Um bom começo.<br />Grandes possibilidades.</h1>
        <p>Prepare seu espaço para conectar pessoas, organizar projetos e dar forma às suas ideias.</p>
        <SetupSteps steps={steps} current={step} />
        <span className="onboarding-note">Seu próximo projeto começa aqui.</span>
      </aside>
      <section className="panel onboarding-card" aria-labelledby="onboarding-step-title">
        <header className="onboarding-step-header">
          <span className="eyebrow">PASSO {step + 1} DE 2</span>
          <h2 id="onboarding-step-title" ref={heading} tabIndex={-1}>
            {step === 0 ? 'Adicione sua empresa.' : 'Crie junto com sua equipe.'}
          </h2>
          <p>{step === 0
            ? 'Um espaço compartilhado para seus projetos e para quem faz parte deles.'
            : 'Convide seus colaboradores para participar dos projetos e do Kanban.'}</p>
        </header>
        {workspace.isSuccess
          ? <TeamStep companyName={workspace.data.workspace.name} onFinish={onFinish} />
          : <CompanyStep />}
      </section>
    </div>
  )
}
