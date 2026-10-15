import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/features/notifications/services/notification-service'
import { notification, notificationPage } from './fixtures/notifications'

const backend = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => backend }))
const scope = { workspaceId: notification.workspace_id, userId: notification.recipient_id }
beforeEach(() => backend.rpc.mockReset())

describe('Notification contracts', () => {
  it('accepts confirmed empty and keeps the server snapshot boundary', async () => {
    backend.rpc.mockResolvedValue({ data: { ...notificationPage, items: [], unread_count: 0 }, error: null })
    await expect(fetchNotifications(scope, false, null)).resolves.toMatchObject({ items: [], unread_count: 0, as_of: notificationPage.as_of })
  })
  it.each([null, {}, { ...notificationPage, unread_count: null }, { ...notificationPage, has_more: true },
    { ...notificationPage, items: [notification, notification] },
    { ...notificationPage, items: [{ ...notification, kind: 'status_changed' }] },
    { ...notificationPage, items: [{ ...notification, recipient_id: notification.actor_id }] },
    { ...notificationPage, items: [{ ...notification, workspace_id: notification.project_id }] },
  ])('rejects incomplete, duplicate or wrongly scoped responses', async data => {
    backend.rpc.mockResolvedValue({ data, error: null })
    await expect(fetchNotifications(scope, false, null)).rejects.toMatchObject({ kind: 'contract' })
  })
  it('preserves permission errors rather than returning zero notifications', async () => {
    backend.rpc.mockResolvedValue({ data: null, error: { code: '42501' } })
    await expect(fetchNotifications(scope, false, null)).rejects.toMatchObject({ kind: 'permission' })
  })
  it('passes both cursor fields and the unread filter', async () => {
    backend.rpc.mockResolvedValue({ data: notificationPage, error: null })
    await fetchNotifications(scope, true, { id: notification.id, time: notification.created_at })
    expect(backend.rpc).toHaveBeenCalledWith('notification_inbox', {
      target_workspace: scope.workspaceId, unread_only: true, before_id: notification.id, before_time: notification.created_at,
    })
  })
  it.each([null, notification, { ...notification, id: notification.event_id, read_at: notificationPage.as_of }])('requires the affected row and read timestamp', async data => {
    backend.rpc.mockResolvedValue({ data, error: null })
    await expect(markNotificationRead(scope, notification.id)).rejects.toMatchObject({ kind: 'contract' })
  })
  it('accepts persisted reads and an explicit zero-item bulk no-op', async () => {
    backend.rpc.mockResolvedValueOnce({ data: { ...notification, read_at: notificationPage.as_of }, error: null })
    await expect(markNotificationRead(scope, notification.id)).resolves.toMatchObject({ read_at: notificationPage.as_of })
    backend.rpc.mockResolvedValueOnce({ data: 0, error: null })
    await expect(markAllNotificationsRead(scope, notificationPage.as_of)).resolves.toBe(0)
    expect(backend.rpc).toHaveBeenLastCalledWith('mark_all_notifications_read', { target_workspace: scope.workspaceId, through_time: notificationPage.as_of })
  })
  it('rejects missing bulk acknowledgements', async () => {
    backend.rpc.mockResolvedValue({ data: null, error: null })
    await expect(markAllNotificationsRead(scope, notificationPage.as_of)).rejects.toMatchObject({ kind: 'contract' })
  })
})
