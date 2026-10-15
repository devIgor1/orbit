import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LiveUpdateStatus({ state, onReconnect, subject }: {
  state: 'connecting' | 'connected' | 'disconnected'; onReconnect: () => void; subject?: string
}) {
  if (state === 'connected') return null
  return <div className="notification-connection" role="status">
    <span>{subject && `${subject}: `}{state === 'connecting' ? 'Conectando atualizações ao vivo…'
      : 'Atualizações ao vivo indisponíveis. A lista será consultada periodicamente.'}</span>
    {state === 'disconnected' && <Button variant="ghost" size="sm" onClick={onReconnect}>
      <RefreshCw aria-hidden="true" />Reconectar{subject ? ` ${subject.toLowerCase()}` : ''}
    </Button>}
  </div>
}
