import { useState } from 'react'
import { Copy, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { errorMessage } from '@/lib/errors/app-error'
import { useInvitations, useManageInvitations } from '../hooks/use-invitations'
import { InvitationForm } from './invitation-form'
import { InvitationList } from './invitation-list'

export function InvitationManager() {
  const invitations = useInvitations()
  const mutation = useManageInvitations()
  const [notice, setNotice] = useState('')
  const [copyError, setCopyError] = useState('')
  const [createdId, setCreatedId] = useState<string | null>(null)
  const inviteUrl = (id: string) => new URL(`/companies?invitation=${id}`, window.location.origin).toString()
  async function copy(id: string) {
    setCopyError('')
    setNotice('')
    try {
      await navigator.clipboard.writeText(inviteUrl(id))
      setNotice('Link copiado. Compartilhe com o colaborador convidado.')
    } catch {
      setCopyError('Não foi possível copiar. Selecione o link abaixo e copie manualmente.')
      setCreatedId(id)
    }
  }
  async function manage(action: 'send' | 'revoke', id: string) {
    setNotice('')
    setCopyError('')
    try {
      await mutation.mutateAsync({ action, id })
      if (action === 'revoke' && createdId === id) setCreatedId(null)
      setNotice(action === 'send' ? 'E-mail do convite enviado.' : 'Convite cancelado.')
    } catch {
      // Display the mutation error and the backend's persisted delivery state.
    }
  }
  return <div className="invitation-manager">
    <InvitationForm busy={mutation.isPending} onInvite={async (email, sendEmail) => {
      setNotice('')
      setCopyError('')
      setCreatedId(null)
      const invitation = await mutation.mutateAsync({ action: 'invite', email, sendEmail })
      setCreatedId(invitation.id)
      setNotice(sendEmail ? `Convite enviado por e-mail para ${email}.` : 'Convite criado. Copie o link e compartilhe com o colaborador.')
    }} />
    {mutation.isError && <p role="alert" className="form-error">{errorMessage(mutation.error)}</p>}
    {notice && <p role="status" className="success-notice">{notice}</p>}
    {copyError && <p role="alert" className="form-error">{copyError}</p>}
    {createdId && <div className="form-field">
      <label htmlFor="invitation-link">Link do convite</label>
      <Input id="invitation-link" readOnly value={inviteUrl(createdId)} onFocus={(event) => event.currentTarget.select()} />
      <Button variant="outline" onClick={() => void copy(createdId)}><Copy /> Copiar link</Button>
    </div>}
    <section className="invitation-pending">
      <div className="invitation-section-header">
        <h3>Convites pendentes</h3>
        <Button variant="ghost" size="sm" disabled={invitations.isFetching || mutation.isPending}
          onClick={() => void invitations.refetch()}><RefreshCw /> Atualizar</Button>
      </div>
      {invitations.isPending ? <LoadingState label="Buscando convites…" />
        : invitations.isError ? <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />
        : invitations.data.length === 0 ? <EmptyState title="Nenhum convite pendente" description="Crie um convite acima para adicionar alguém à empresa." />
        : <InvitationList invitations={invitations.data} busy={mutation.isPending} onCopy={(id) => void copy(id)}
          onSend={(id) => void manage('send', id)} onRevoke={(id) => void manage('revoke', id)} />}
    </section>
  </div>
}
