import { z } from 'zod'
import { getSupabase } from '@/lib/supabase/client'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { requireCollection } from '@/lib/supabase/require-data'
import { githubApiError } from './github-errors'

const idSchema = z.object({ id: z.uuid() })
const configSchema = z.discriminatedUnion('configured', [
  z.object({ configured: z.literal(false) }),
  z.object({
    configured: z.literal(true),
    installationUrl: z.url().startsWith('https://github.com/apps/'),
    callbackUrl: z.url(),
  }),
])
async function invoke<T>(body: object, schema: z.ZodType<T>) {
  const { data, error } = await getSupabase().functions.invoke('github-api', { body })
  if (error) throw await githubApiError(error)
  const result = schema.safeParse(data)
  if (!result.success) throw new AppError('contract', 'O servidor não confirmou os dados da integração GitHub.')
  return result.data
}
export const fetchGithubConfig = () => invoke({ action: 'config' }, configSchema)
export const beginGithubConnection = (workspaceId: string, repository: string) =>
  invoke(
    { action: 'connect', workspaceId, repository },
    z.object({ url: z.url().startsWith('https://github.com/login/oauth/authorize?') }),
  )
export const completeGithubConnection = (state: string, code: string) =>
  invoke({ action: 'callback', state, code }, idSchema.extend({ workspaceId: z.uuid() }))
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
