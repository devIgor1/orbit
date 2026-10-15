import { z } from 'zod'
import type { Database } from '@/lib/supabase/database.generated'

export type Notification = Database['public']['Tables']['notifications']['Row']
const timestamp = z.iso.datetime({ offset: true })

export const notificationSchema = z.object({
  id: z.uuid(), workspace_id: z.uuid(), recipient_id: z.uuid(), actor_id: z.uuid().nullable(),
  actor_name: z.string().min(1), event_id: z.uuid(), kind: z.enum(['assigned', 'commented', 'status_changed']),
  project_id: z.uuid(), task_id: z.uuid(), task_title: z.string().min(1),
  task_status: z.enum(['todo', 'in_progress', 'review', 'done']).nullable(),
  created_at: timestamp, read_at: timestamp.nullable(),
}).refine(item => (item.kind === 'status_changed') === (item.task_status !== null), 'Etapa da notificação inválida.') satisfies z.ZodType<Notification>

export const inboxSchema = z.object({
  items: z.array(notificationSchema).max(20), has_more: z.boolean(),
  unread_count: z.number().int().nonnegative(), as_of: timestamp,
}).superRefine((page, context) => {
  if (page.has_more && page.items.length !== 20) context.addIssue({ code: 'custom', message: 'Página incompleta.' })
  if (new Set(page.items.map(item => item.id)).size !== page.items.length)
    context.addIssue({ code: 'custom', message: 'Notificações duplicadas.' })
})

export type NotificationPage = z.infer<typeof inboxSchema>
export type NotificationCursor = { time: string; id: string }
