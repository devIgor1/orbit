import { useState } from 'react'
import { ArrowRight, Building2, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { InvitationManager } from '@/features/companies/components/invitation-manager'
import type { Database, Workspace } from '@/lib/supabase/database.types'
import { SettingsSection } from './settings-section'

type MemberRole = Database['public']['Tables']['workspace_members']['Row']['role']

export function SettingsCompany({ workspace, role }: { workspace: Workspace; role: MemberRole }) {
  const [invitationsOpen, setInvitationsOpen] = useState(false)
  const isAdmin = role === 'admin'

  return (
    <SettingsSection title="Empresa e acesso" description="O espaço que reúne seus projetos e sua equipe.">
      <div className="settings-company-summary">
        <span className="settings-company-icon">
          <Building2 aria-hidden="true" />
        </span>
        <div className="settings-identity-copy">
          <span className="settings-field-label">Empresa atual</span>
          <h3 title={workspace.name}>{workspace.name}</h3>
        </div>
        <Badge status={role} />
      </div>
      <p className="settings-access-description">
        {isAdmin
          ? 'Você administra esta empresa e pode convidar colaboradores para trabalhar com você.'
          : 'Você faz parte desta equipe. Para adicionar colaboradores, fale com um administrador da empresa.'}
      </p>
      <div className="settings-company-actions">
        <Link className="settings-action-link" to="/companies">
          <Building2 aria-hidden="true" />
          <span>
            <strong>Suas empresas</strong>
            <small>Troque de empresa, cadastre uma nova ou aceite um convite.</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link className="settings-action-link" to="/team">
          <Users aria-hidden="true" />
          <span>
            <strong>Conhecer a equipe</strong>
            <small>Encontre as pessoas que trabalham com você.</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      {isAdmin && (
        <Dialog
          open={invitationsOpen}
          onOpenChange={setInvitationsOpen}
          title="Equipe e convites"
          description={`Convide colaboradores e acompanhe os convites de ${workspace.name}.`}
          trigger={
            <Button variant="outline">
              <UserPlus /> Gerenciar convites
            </Button>
          }
        >
          <InvitationManager />
        </Dialog>
      )}
    </SettingsSection>
  )
}
