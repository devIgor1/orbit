import { useState } from 'react'
import { ArrowRight, Building2, Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { InvitationManager } from '@/features/companies/components/invitation-manager'
import { CompanyRenameForm } from '@/features/companies/components/company-rename-form'
import { CompanyDeleteForm } from '@/features/companies/components/company-delete-form'
import { useCompanyAdministration } from '@/features/companies/hooks/use-companies'
import type { Database, Workspace } from '@/lib/supabase/database.types'
import { SettingsSection } from './settings-section'

type MemberRole = Database['public']['Tables']['workspace_members']['Row']['role']

export function SettingsCompany({ workspace, role }: { workspace: Workspace; role: MemberRole }) {
  const [invitationsOpen, setInvitationsOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { rename, remove } = useCompanyAdministration(workspace.id)
  const navigate = useNavigate()
  const isAdmin = role === 'admin'
  async function saveName(name: string) {
    try {
      await rename.mutateAsync(name)
      setRenaming(false)
    } catch {
      /* The form keeps the typed name and shows the error. */
    }
  }
  async function deleteCompany(confirmation: string) {
    try {
      await remove.mutateAsync(confirmation)
      navigate('/companies', { replace: true })
    } catch {
      /* The dialog stays open with the error. */
    }
  }

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
        {isAdmin && (
          <Link className="settings-action-link" to="/trash">
            <Trash2 aria-hidden="true" />
            <span>
              <strong>Lixeira</strong>
              <small>Restaure projetos e tarefas excluídos nos últimos 15 dias.</small>
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </div>
      {isAdmin && (
        <Dialog
          open={renaming}
          onOpenChange={(value) => {
            if (rename.isPending) return
            if (!value) rename.reset()
            setRenaming(value)
          }}
          title="Renomear empresa"
          description="O novo nome aparece para todos os membros."
          trigger={
            <Button variant="outline">
              <Pencil /> Renomear empresa
            </Button>
          }
        >
          {renaming && (
            <CompanyRenameForm
              name={workspace.name}
              isPending={rename.isPending}
              error={rename.error}
              onSubmit={saveName}
              onCancel={() => setRenaming(false)}
            />
          )}
        </Dialog>
      )}
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
      {isAdmin && (
        <div className="danger-zone">
          <div>
            <strong>Excluir empresa</strong>
            <p>A empresa vai para a lixeira por 15 dias e todos os membros perdem o acesso.</p>
          </div>
          <Dialog
            open={deleting}
            onOpenChange={(value) => {
              if (remove.isPending) return
              if (!value) remove.reset()
              setDeleting(value)
            }}
            title={`Excluir ${workspace.name}?`}
            description="Confira o que acontece antes de confirmar."
            trigger={
              <Button variant="destructive">
                <Trash2 /> Excluir empresa
              </Button>
            }
          >
            {deleting && (
              <CompanyDeleteForm
                name={workspace.name}
                isPending={remove.isPending}
                error={remove.error}
                onConfirm={(confirmation) => void deleteCompany(confirmation)}
                onCancel={() => setDeleting(false)}
              />
            )}
          </Dialog>
        </div>
      )}
    </SettingsSection>
  )
}
