import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import type { Notification, NotificationCursor } from '../schemas/notification-schema'
import * as service from '../services/notification-service'
import { useNotificationRealtime } from './use-notification-realtime'

export function useNotifications(unreadOnly: boolean) {
  const scope = useQueryScope()
  const cache = useQueryClient()
  const live = useNotificationRealtime(scope.workspaceId, scope.userId)
  const queryKey = ['notifications', scope.userId, scope.workspaceId]
  const inbox = useInfiniteQuery({
    queryKey: [...queryKey, unreadOnly],
    initialPageParam: null as NotificationCursor | null,
    queryFn: ({ pageParam }) => service.fetchNotifications(scope.requireScope(), unreadOnly, pageParam),
    getNextPageParam: page => {
      const last = page.items.at(-1)
      return page.has_more && last ? { time: last.created_at, id: last.id } : undefined
    },
    enabled: scope.enabled,
    // Also reconcile on focus and periodically if a socket is interrupted.
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
  })
  const onSuccess = async () => { await cache.invalidateQueries({ queryKey }) }
  const markRead = useMutation({ mutationFn: (id: string) => service.markNotificationRead(scope.requireScope(), id), onSuccess })
  const markAllRead = useMutation({ mutationFn: (time: string) => service.markAllNotificationsRead(scope.requireScope(), time), onSuccess })
  async function refreshTask(item: Notification) {
    await Promise.all([
      ['tasks', scope.userId, scope.workspaceId, item.project_id],
      ['project', scope.userId, scope.workspaceId, item.project_id],
      ['task-comments', scope.userId, scope.workspaceId, item.task_id],
      ['task-history', scope.userId, scope.workspaceId, item.task_id],
    ].map(key => cache.invalidateQueries({ queryKey: key })))
  }
  return { inbox, markRead, markAllRead, refreshTask, ...live }
}
