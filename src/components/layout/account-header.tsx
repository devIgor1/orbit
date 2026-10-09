import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Brand } from './brand'

export function AccountHeader({ email, busy, onSignOut }: {
  email: string | undefined
  busy: boolean
  onSignOut: () => void
}) {
  return (
    <header className="account-header">
      <Brand />
      <div className="account-header-session">
        <span>{email}</span>
        <Button variant="outline" disabled={busy} onClick={onSignOut}><LogOut /> Sair</Button>
      </div>
    </header>
  )
}
