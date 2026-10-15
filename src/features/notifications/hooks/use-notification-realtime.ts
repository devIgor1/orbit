import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeToNotifications, type NotificationConnection } from '../services/notification-realtime'

export function useNotificationRealtime(workspaceId: string | undefined, userId: string | undefined) {
  const cache = useQueryClient()
  const [connection, setConnection] = useState<NotificationConnection>('connecting')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!workspaceId || !userId) return
    return subscribeToNotifications(workspaceId, userId,
      () => { void cache.invalidateQueries({ queryKey: ['notifications', userId, workspaceId] }) },
      setConnection)
  }, [cache, workspaceId, userId, attempt])
  return { connection, reconnect: () => { setConnection('connecting'); setAttempt(value => value + 1) } }
}
