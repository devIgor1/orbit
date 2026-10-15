import { subscribeToPrivateBroadcast, type BroadcastConnection } from '@/lib/supabase/private-broadcast'

export type NotificationConnection = BroadcastConnection

export function subscribeToNotifications(
  workspaceId: string, userId: string, refresh: () => void,
  onConnection: (state: NotificationConnection) => void,
) {
  return subscribeToPrivateBroadcast(`notifications:${workspaceId}:${userId}`, 'inbox_changed', refresh, onConnection)
}
