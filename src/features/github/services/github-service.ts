import { z } from 'zod'
import { getSupabase } from '@/lib/supabase/client'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { requireCollection } from '@/lib/supabase/require-data'
import { invokeGithub as invoke } from './github-api'

const idSchema = z.object({ id: z.uuid() })
const configSchema = z.discriminatedUnion('configured', [
  z.object({ configured: z.literal(false) }),
  z.object({
    configured: z.literal(true),
    installationUrl: z.url().startsWith('https://github.com/apps/'),
    callbackUrl: z.url(),
  }),
])
export const fetchGithubConfig = () => invoke({ action: 'config' }, configSchema)
export const beginGithubConnection = (workspaceId: string) =>
  invoke(
    { action: 'discover-account', workspaceId },
    z.object({ url: z.url().startsWith('https://github.com/login/oauth/authorize?') }),
  )
export const authorizeGithubConnection = (state: string, installationId: number) =>
  invoke(
    { action: 'installation-callback', state, installationId },
    z.object({ url: z.url().startsWith('https://github.com/login/oauth/authorize?') }),
  )
export async function completeGithubConnection(state: string, code: string) {
  // Legacy flow already required one explicit repository name.
  const result = await invoke({ action: 'callback', state, code }, idSchema.extend({ workspaceId: z.uuid() }))
  return { workspaceId: result.workspaceId, repositoryCount: 1, skippedCount: 0, accountLogin: null }
}

export async function fetchGithubRepositories(workspaceId: string) {
  const { data, error } = await getSupabase()
    .from('github_repositories')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('full_name')
  if (error) throw toAppError(error)
  return requireCollection(data)
}
export async function fetchProjectGithub(workspaceId: string, projectId: string) {
  const { data, error } = await getSupabase()
    .from('project_github_repositories')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data
}
export async function fetchTaskGithub(workspaceId: string, taskId: string) {
  const { data, error } = await getSupabase()
    .from('task_github_links')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('task_id', taskId)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data
}
function confirmId(data: unknown, error: unknown, expected?: string) {
  if (error) {
    if (typeof error === 'object' && 'code' in error && error.code === '55P03')
      throw new AppError('contract', 'A sincronização está em andamento. Aguarde um instante e tente novamente.')
    throw toAppError(error)
  }
  if (!z.uuid().safeParse(data).success || (expected && data !== expected))
    throw new AppError('contract', 'A alteração do vínculo não foi confirmada pelo servidor.')
}
export async function setProjectGithub(workspaceId: string, projectId: string, repositoryId: string) {
  const { data, error } = await getSupabase().rpc('set_project_github_repository', {
    target_workspace: workspaceId,
    target_project: projectId,
    target_repository: repositoryId,
  })
  confirmId(data, error, repositoryId)
}
export async function disconnectGithub(workspaceId: string, repositoryId: string) {
  const { data, error } = await getSupabase().rpc('disconnect_github_repository', {
    target_workspace: workspaceId,
    target_repository: repositoryId,
  })
  confirmId(data, error, repositoryId)
}
export type LinkInput = { repositoryId: string; branch?: string; prNumber?: number }
export const linkGithubTask = (workspaceId: string, taskId: string, input: LinkInput) =>
  invoke({ action: 'link', workspaceId, taskId, ...input }, idSchema)
export async function changeTaskGithub(workspaceId: string, taskId: string, action: 'unlink' | 'retry') {
  const { data, error } = await getSupabase().rpc(action === 'unlink' ? 'unlink_task_github' : 'retry_task_github', {
    target_workspace: workspaceId,
    target_task: taskId,
  })
  confirmId(data, error)
}
