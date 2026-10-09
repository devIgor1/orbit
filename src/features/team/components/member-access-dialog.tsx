import { useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Ellipsis, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ErrorState, LoadingState } from '@/components/shared/query-state'
import { useAuth } from '@/features/auth/use-auth'
import { errorMessage } from '@/lib/errors/app-error'
import type { TeamMember } from '@/lib/supabase/database.types'
import { useMemberDetails, useManageMember } from '../hooks/use-member-management'
import { useTeam } from '../hooks/use-team'
import { MemberRoleForm } from './member-role-form'
import { RemoveMemberForm } from './remove-member-form'
import type { MemberChange } from '../services/member-management-service'

function MemberAccessContent({ memberId, onDone }: { memberId: string; onDone: (message: string) => void }) {
  const [action, setAction] = useState<'role' | 'remove'>('role')
  const details = useMemberDetails(memberId)
  const team = useTeam()
  const mutation = useManageMember()
  const { user } = useAuth()
  const navigate = useNavigate()
  const refresh = async () => { mutation.reset(); await Promise.all([details.refetch(), team.refetch()]) }
  async function submit(change: MemberChange) {
    try {
      await mutation.mutateAsync(change)
      onDone(change.action === 'role' ? 'Nível de acesso atualizado.' : 'Acesso removido e tarefas atualizadas.')
      if (change.memberId === user?.id) navigate(change.action === 'remove' ? '/companies' : '/dashboard', { replace: true })
    } catch { /* Preserve the selection and show the server error. */ }
  }
  if (details.isError) return <ErrorState error={details.error} onRetry={() => void refresh()} />
  if (team.isError) return <ErrorState error={team.error} onRetry={() => void refresh()} />
  if (details.isPending || team.isPending) return <LoadingState label="Conferindo acesso e tarefas…" />
  const member = details.data
  const busy = mutation.isPending || details.isFetching || team.isFetching
  return <div className="member-management">
    <div className="section-tabs" role="group" aria-label="Ação sobre o membro">
      <button type="button" data-active={action === 'role'} aria-pressed={action === 'role'} disabled={busy} onClick={() => { mutation.reset(); setAction('role') }}>Alterar acesso</button>
      <button type="button" data-active={action === 'remove'} aria-pressed={action === 'remove'} disabled={busy} onClick={() => { mutation.reset(); setAction('remove') }}>Remover membro</button>
    </div>
    {mutation.isError && <div className="member-management-error"><p role="alert" className="form-error">{errorMessage(mutation.error)}</p>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}><RefreshCw /> Atualizar dados</Button></div>}
    {action === 'role' ? <MemberRoleForm key={`${member.role}-${details.dataUpdatedAt}`} member={member} busy={busy} isSelf={memberId === user?.id}
      onSubmit={role => submit({ action: 'role', memberId, expectedRole: member.role, role })} />
      : <RemoveMemberForm key={details.dataUpdatedAt} member={member} members={team.data} busy={busy} isSelf={memberId === user?.id}
        onSubmit={replacement => submit({ action: 'remove', memberId, expectedRole: member.role, pendingTasks: member.pending_tasks, replacement })} />}
  </div>
}

export function MemberAccessDialog({ member, companyName, onChanged }: { member: TeamMember; companyName: string; onChanged: (message: string) => void }) {
  const [open, setOpen] = useState(false)
  const pending = useIsMutating({ mutationKey: ['manage-member'] }) > 0
  return <Dialog open={open} onOpenChange={next => { if (!pending) setOpen(next) }} title="Gerenciar acesso"
    description={`${member.full_name} · ${companyName}`}
    trigger={<Button variant="ghost" size="icon" aria-label={`Gerenciar acesso de ${member.full_name}`}><Ellipsis /></Button>}>
    {open && <MemberAccessContent memberId={member.id} onDone={message => { setOpen(false); onChanged(message) }} />}
  </Dialog>
}
