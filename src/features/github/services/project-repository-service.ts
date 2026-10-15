import { z } from 'zod'
import { getSupabase } from '@/lib/supabase/client'
import { AppError, toAppError } from '@/lib/errors/app-error'

export async function fetchProjectRepository(workspaceId: string, projectId: string) {
  const { data, error } = await getSupabase()
    .from('project_github_repositories')
    .select('repository_id')
    .eq('workspace_id', workspaceId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data?.repository_id ?? null
}
function confirm(data: unknown, error: unknown, expected: string) {
  if (error) throw toAppError(error)
  if (!z.uuid().safeParse(data).success || data !== expected)
    throw new AppError('contract', 'A alteração do repositório do projeto não foi confirmada pelo servidor.')
}
export async function setProjectRepository(workspaceId: string, projectId: string, repositoryId: string) {
  const { data, error } = await getSupabase().rpc('set_project_github_repository', {
    target_workspace: workspaceId,
    target_project: projectId,
    target_repository: repositoryId,
  })
  confirm(data, error, repositoryId)
}
export async function clearProjectRepository(workspaceId: string, projectId: string) {
  const { data, error } = await getSupabase().rpc('clear_project_github_repository', {
    target_workspace: workspaceId,
    target_project: projectId,
  })
  confirm(data, error, projectId)
}
