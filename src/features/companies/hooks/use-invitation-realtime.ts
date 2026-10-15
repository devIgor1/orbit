import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeToPrivateBroadcast, type BroadcastConnection } from '@/lib/supabase/private-broadcast'

export function useInvitationRealtime(userId: string | undefined) {
  const cache = useQueryClient()
  const [connection, setConnection] = useState<BroadcastConnection>('connecting')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!userId) return
    return subscribeToPrivateBroadcast(`invitations:${userId}`, 'invitations_changed',
      () => { void cache.invalidateQueries({ queryKey: ['my-invitations', userId] }) }, setConnection)
  }, [cache, userId, attempt])
  return { connection, reconnect: () => { setConnection('connecting'); setAttempt(value => value + 1) } }
}
