import { useIsMutating } from '@tanstack/react-query'
import { ArrowRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvitationManager } from '@/features/companies/components/invitation-manager'

export function TeamStep({ companyName, onFinish }: { companyName: string; onFinish: () => void }) {
  const inviting = useIsMutating({ mutationKey: ['manage-invitations'] }) > 0
  return (
    <>
      <div className="onboarding-company"><Building2 aria-hidden="true" /><span>{companyName}</span></div>
      <InvitationManager />
      <footer className="onboarding-step-footer">
        <p>Você também pode convidar sua equipe depois, pela tela de Equipe.</p>
        <Button disabled={inviting} onClick={onFinish}>Ir para o workspace <ArrowRight /></Button>
      </footer>
    </>
  )
}
