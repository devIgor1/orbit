import type { Notification, NotificationPage } from '@/features/notifications/schemas/notification-schema'

export const notification: Notification = {
  id: 'ee000000-0000-4000-8000-000000000001',
  workspace_id: 'ee000000-0000-4000-8000-000000000010',
  recipient_id: 'ee000000-0000-4000-8000-000000000002',
  actor_id: 'ee000000-0000-4000-8000-000000000003', actor_name: 'Marina Costa',
  event_id: 'ee000000-0000-4000-8000-000000000004', kind: 'assigned',
  project_id: 'ee000000-0000-4000-8000-000000000020',
  task_id: 'ee000000-0000-4000-8000-000000000030', task_title: 'Revisar a identidade visual',
  task_status: null, created_at: '2026-10-15T10:00:00+00:00', read_at: null,
}
export const notificationPage: NotificationPage = {
  items: [notification], unread_count: 1, has_more: false, as_of: '2026-10-15T10:01:00+00:00',
}
