import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { requireCollection, requireRecord } from '@/lib/supabase/require-data'
import type { Project } from '@/lib/supabase/database.types'

export type ProjectFilters = { search?: string; status?: Project['status'] | 'all'; page?: number }
export type ProjectInput = Pick<Project, 'title'> & Partial<Pick<Project, 'description' | 'status' | 'due_date'>>
export const PROJECTS_PAGE_SIZE = 9

export async function fetchProjects(workspaceId: string, filters: ProjectFilters) {
  const page = Math.max(1, filters.page ?? 1)
  let request = getSupabase().from('projects').select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).order('id')
    .range((page - 1) * PROJECTS_PAGE_SIZE, page * PROJECTS_PAGE_SIZE - 1)
  if (filters.search?.trim()) request = request.ilike('title', `%${filters.search.trim().replace(/[%_]/g, '\\$&')}%`)
  if (filters.status && filters.status !== 'all') request = request.eq('status', filters.status)
  const { data, error, count } = await request
  if (error) throw toAppError(error)
  if (!data || count === null) throw new AppError('contract', 'A listagem de projetos retornou uma resposta incompleta.')
  return { items: requireCollection(data), total: count }
}

export async function fetchProject(workspaceId: string, id: string) {
  const { data, error } = await getSupabase().from('projects').select('*').eq('workspace_id', workspaceId).eq('id', id).single()
  if (error) throw toAppError(error)
  return requireRecord(data, id)
}

export async function createProject(workspaceId: string, userId: string, input: ProjectInput) {
  const { data, error } = await getSupabase().from('projects').insert({ ...input, workspace_id: workspaceId, created_by: userId }).select('*').single()
  if (error) throw toAppError(error)
  return requireRecord(data)
}

export async function updateProject(workspaceId: string, input: Partial<ProjectInput> & { id: string }) {
  const { id, ...values } = input
  const { data, error } = await getSupabase().from('projects').update(values).eq('workspace_id', workspaceId).eq('id', id).select('*').single()
  if (error) throw toAppError(error)
  return requireRecord(data, id)
}
