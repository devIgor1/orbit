import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'

export type NotificationConnection = 'connecting' | 'connected' | 'disconnected'

export function subscribeToNotifications(
  workspaceId: string, userId: string, refresh: () => void,
  onConnection: (state: NotificationConnection) => void,
) {
  const client = getSupabase()
  let active = true
  let channel: RealtimeChannel | undefined
  void client.realtime.setAuth().then(() => {
    if (!active) return
    channel = client.channel(`notifications:${workspaceId}:${userId}`, { config: { private: true } })
      .on('broadcast', { event: 'inbox_changed' }, () => { if (active) refresh() })
      .subscribe(status => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          onConnection('connected')
          // Recover anything missed before joining, while offline or on reconnect.
          refresh()
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) onConnection('disconnected')
      })
  }).catch(() => { if (active) onConnection('disconnected') })
  return () => {
    active = false
    if (channel) void client.removeChannel(channel)
  }
}
