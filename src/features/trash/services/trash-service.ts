import { z } from 'zod'
import { getSupabase } from '@/lib/supabase/client'
import { AppError, toAppError } from '@/lib/errors/app-error'

const entry = {
  id: z.guid(),
  title: z.string(),
  deleted_at: z.string(),
  deleted_by: z.string().nullable(),
  purge_at: z.string(),
}
const trashSchema = z.object({
  projects: z.array(z.object({ ...entry, task_count: z.number().int().nonnegative() })),
  tasks: z.array(z.object({ ...entry, project_id: z.guid(), project_title: z.string() })),
})
export type Trash = z.infer<typeof trashSchema>
export type TrashKind = 'project' | 'task'
export type TrashAction = 'delete' | 'restore' | 'purge'

/** Messages for the trash RPCs; other failures keep the shared translation. */
export function trashError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code === '55000') return new AppError('contract', 'Restaure o projeto desta tarefa antes de restaurá-la.')
  if (code === 'P0002') return new AppError('contract', 'Este item não está mais na lixeira. Atualize a página.')
  return toAppError(error)
}

export async function fetchTrash(workspaceId: string) {
  const { data, error } = await getSupabase().rpc('trash_items', { target_workspace: workspaceId })
  if (error) throw trashError(error)
  const parsed = trashSchema.safeParse(data)
  if (!parsed.success) throw new AppError('contract', 'A lixeira retornou uma resposta inesperada.')
  return parsed.data
}

const rpcs = {
  project: { delete: 'delete_project', restore: 'restore_project', purge: 'purge_project' },
  task: { delete: 'delete_task', restore: 'restore_task', purge: 'purge_task' },
} as const

export async function changeTrash(workspaceId: string, kind: TrashKind, action: TrashAction, id: string) {
  const client = getSupabase()
  const { data, error } =
    kind === 'project'
      ? await client.rpc(rpcs.project[action], { target_workspace: workspaceId, target_project: id })
      : await client.rpc(rpcs.task[action], { target_workspace: workspaceId, target_task: id })
  if (error) throw trashError(error)
  if (data !== id) throw new AppError('contract', 'O servidor não confirmou a alteração.')
}
