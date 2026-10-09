import { toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { requireCollection, requireRecord } from '@/lib/supabase/require-data'
import type { Task } from '@/lib/supabase/database.types'

export type TaskInput = Pick<Task, 'title'> & Partial<Pick<Task, 'description' | 'status' | 'priority' | 'assignee_id' | 'due_date'>>

export async function fetchTasks(workspaceId: string, projectId: string) {
  const { data, error } = await getSupabase().from('tasks').select('*')
    .eq('workspace_id', workspaceId).eq('project_id', projectId).order('created_at').order('id')
  if (error) throw toAppError(error)
  return requireCollection(data)
}

export async function createTask(workspaceId: string, projectId: string, userId: string, input: TaskInput) {
  const { data, error } = await getSupabase().from('tasks')
    .insert({ ...input, workspace_id: workspaceId, project_id: projectId, created_by: userId }).select('*').single()
  if (error) throw toAppError(error)
  return requireRecord(data)
}

export async function updateTask(workspaceId: string, projectId: string, input: Partial<TaskInput> & { id: string }) {
  const { id, ...values } = input
  const { data, error } = await getSupabase().from('tasks').update(values)
    .eq('workspace_id', workspaceId).eq('project_id', projectId).eq('id', id).select('*').single()
  if (error) throw toAppError(error)
  return requireRecord(data, id)
}

export async function fetchComments(workspaceId: string, taskId: string) {
  const { data, error } = await getSupabase().from('task_comments').select('*')
    .eq('workspace_id', workspaceId).eq('task_id', taskId).order('created_at')
  if (error) throw toAppError(error)
  return requireCollection(data)
}

export async function fetchHistory(workspaceId: string, taskId: string) {
  const { data, error } = await getSupabase().from('activity_events').select('*')
    .eq('workspace_id', workspaceId).eq('task_id', taskId).order('created_at', { ascending: false }).limit(50)
  if (error) throw toAppError(error)
  return requireCollection(data)
}

export async function addComment(workspaceId: string, taskId: string, userId: string, body: string) {
  const { data, error } = await getSupabase().from('task_comments')
    .insert({ workspace_id: workspaceId, task_id: taskId, author_id: userId, body }).select('*').single()
  if (error) throw toAppError(error)
  return requireRecord(data)
}
