import { Bell, CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications } from '../hooks/use-notifications'
import type { Notification } from '../schemas/notification-schema'
import { NotificationPanel } from './notification-panel'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const state = useNotifications(unreadOnly)
  const navigate = useNavigate()
  const failed = state.inbox.isError || state.markRead.isError || state.markAllRead.isError
  const count = state.inbox.isSuccess && !failed ? state.inbox.data.pages[0].unread_count : undefined
  const label = failed ? 'Notificações — não foi possível atualizar'
    : count === undefined ? 'Notificações — carregando' : `Notificações — ${count} não lidas`
  async function openTask(item: Notification) {
    try {
      if (!item.read_at) await state.markRead.mutateAsync(item.id)
      await state.refreshTask(item)
      setOpen(false)
      navigate(`/projects/${item.project_id}?task=${item.task_id}`)
    } catch { /* The panel displays the confirmed mutation failure and keeps the item unread. */ }
  }
  return <Popover open={open} onOpenChange={setOpen} modal>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="notification-bell" aria-label={label}>
      <Bell aria-hidden="true" />
      {failed ? <CircleAlert className="notification-bell-error" aria-hidden="true" />
        : count !== undefined && count > 0 && <span className="notification-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </Button></PopoverTrigger>
    <PopoverContent align="end" className="notification-panel" aria-labelledby="notifications-title">
      <NotificationPanel state={state} unreadOnly={unreadOnly} onFilter={setUnreadOnly} onClose={() => setOpen(false)} onOpen={item => void openTask(item)} />
    </PopoverContent>
  </Popover>
}
