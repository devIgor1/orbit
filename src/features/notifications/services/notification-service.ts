import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { inboxSchema, notificationSchema, type NotificationCursor } from '../schemas/notification-schema'

type Scope = { workspaceId: string; userId: string }
const invalidResponse = () => new AppError('contract', 'O servidor não confirmou suas notificações. Tente novamente.')

export async function fetchNotifications(scope: Scope, unreadOnly: boolean, cursor: NotificationCursor | null) {
  const { data, error } = await getSupabase().rpc('notification_inbox', {
    target_workspace: scope.workspaceId, unread_only: unreadOnly,
    ...(cursor ? { before_time: cursor.time, before_id: cursor.id } : {}),
  })
  if (error) throw toAppError(error)
  const result = inboxSchema.safeParse(data)
  if (!result.success || result.data.items.some(item => item.workspace_id !== scope.workspaceId
    || item.recipient_id !== scope.userId || (unreadOnly && item.read_at !== null))) throw invalidResponse()
  return result.data
}

export async function markNotificationRead(scope: Scope, id: string) {
  const { data, error } = await getSupabase().rpc('mark_notification_read', {
    target_workspace: scope.workspaceId, notification_id: id,
  })
  if (error) throw toAppError(error)
  const result = notificationSchema.safeParse(data)
  if (!result.success || result.data.id !== id || result.data.workspace_id !== scope.workspaceId
    || result.data.recipient_id !== scope.userId || !result.data.read_at) throw invalidResponse()
  return result.data
}

export async function markAllNotificationsRead(scope: Scope, throughTime: string) {
  const { data, error } = await getSupabase().rpc('mark_all_notifications_read', {
    target_workspace: scope.workspaceId, through_time: throughTime,
  })
  if (error) throw toAppError(error)
  if (typeof data !== 'number' || !Number.isSafeInteger(data) || data < 0) throw invalidResponse()
  // Zero is an explicit, idempotent no-op; the UI refetches and shows no success toast.
  return data
}
