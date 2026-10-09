import { Copy, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { Database } from '@/lib/supabase/database.types'

type Invitation = Database['public']['Tables']['workspace_invitations']['Row'] & { expired: boolean }
interface InvitationListProps {
  invitations: Invitation[]
  busy: boolean
  onCopy: (id: string) => void
  onSend: (id: string) => void
  onRevoke: (id: string) => void
}

function deliveryLabel(status: string) {
  if (status === 'sent') return 'E-mail enviado'
  if (status === 'failed') return 'Falha no envio — tente reenviar'
  if (status === 'sending') return 'Envio aguardando confirmação — atualize a lista ou tente novamente após um minuto'
  return 'E-mail ainda não enviado'
}

export function InvitationList({ invitations, busy, onCopy, onSend, onRevoke }: InvitationListProps) {
  return <ul className="company-list">
    {invitations.map((invitation) => <li className="invitation-row" key={invitation.id}>
      <div className="company-list-details">
        <strong>{invitation.email}</strong>
        <small>{invitation.expired ? 'Expirado — crie novamente para renovar' : `Válido até ${formatDate(invitation.expires_at)}`}</small>
        <small data-delivery-status={invitation.email_status}>{deliveryLabel(invitation.email_status)}</small>
      </div>
      <div className="invitation-actions">
        <Button variant="outline" size="sm" disabled={busy || invitation.expired}
          onClick={() => onSend(invitation.id)} aria-label={`Reenviar e-mail para ${invitation.email}`}>
          <Mail /> {invitation.email_status === 'not_sent' ? 'Enviar e-mail' : 'Reenviar e-mail'}
        </Button>
        <Button variant="outline" size="sm" disabled={busy || invitation.expired}
          onClick={() => onCopy(invitation.id)} aria-label={`Copiar convite para ${invitation.email}`}>
          <Copy /> Link
        </Button>
        <Button variant="ghost" size="sm" disabled={busy}
          onClick={() => onRevoke(invitation.id)} aria-label={`Cancelar convite para ${invitation.email}`}>Cancelar</Button>
      </div>
    </li>)}
  </ul>
}
