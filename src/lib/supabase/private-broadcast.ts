import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from './client'

export type BroadcastConnection = 'connecting' | 'connected' | 'disconnected'

export function subscribeToPrivateBroadcast(
  topic: string, event: string, refresh: () => void, onConnection: (state: BroadcastConnection) => void,
) {
  let client: ReturnType<typeof getSupabase>
  try { client = getSupabase() } catch { onConnection('disconnected'); return () => {} }
  let active = true
  let channel: RealtimeChannel | undefined
  void client.realtime.setAuth().then(() => {
    if (!active) return
    channel = client.channel(topic, { config: { private: true } })
      .on('broadcast', { event }, () => { if (active) refresh() })
      .subscribe(status => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          onConnection('connected')
          refresh()
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) onConnection('disconnected')
      })
  }).catch(() => { if (active) onConnection('disconnected') })
  return () => {
    active = false
    if (channel) void client.removeChannel(channel)
  }
}
