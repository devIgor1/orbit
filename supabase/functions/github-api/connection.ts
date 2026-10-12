import { z } from 'zod'
import { githubConfiguration } from '../_shared/github/config.ts'
import { appToken, githubRequest, repositoryPath } from '../_shared/github/client.ts'
import { repositorySchema } from '../_shared/github/contracts.ts'
import { sha256 } from '../_shared/github/crypto.ts'
import { confirmed, type GithubDatabase } from '../_shared/github/database.ts'
import { GithubError } from '../_shared/github/errors.ts'
import { authorizationUrl, exchangeCode } from './oauth.ts'

export async function beginConnection(db: GithubDatabase, userId: string, workspaceId: string, repository: string) {
  githubConfiguration()
  const state = crypto.randomUUID() + crypto.randomUUID()
  const { error } = await db.rpc('begin_github_connection', {
    requester: userId,
    target_workspace: workspaceId,
    repository_name: repository,
    state_hash: await sha256(state),
  })
  if (error) throw error
  return { url: authorizationUrl(state) }
}
export async function completeConnection(db: GithubDatabase, userId: string, state: string, code: string) {
  const pending = z.object({ workspace_id: z.uuid(), repository_name: z.string() }).parse(
    confirmed(
      await db.rpc('consume_github_connection', {
        requester: userId,
        state_hash: await sha256(state),
      }),
    ),
  )
  const token = await exchangeCode(code)
  // User token proves GitHub authority; an installation ID from the browser never does.
  const repository = await githubRequest(
    token,
    repositoryPath(pending.repository_name),
    repositorySchema,
  )
  const user = await githubRequest(token, '/user', z.object({ login: z.string(), id: z.number() }))
  const permission = await githubRequest(
    token,
    `${repositoryPath(repository.full_name)}/collaborators/${encodeURIComponent(user.login)}/permission`,
    z.object({ permission: z.string(), user: z.object({ id: z.number() }) }),
  )
  if (permission.permission !== 'admin' || permission.user.id !== user.id)
    throw new GithubError('GITHUB_ADMIN_REQUIRED', 403)
  const installation = await githubRequest(
    await appToken(),
    `${repositoryPath(repository.full_name)}/installation`,
    z.object({ id: z.number().int().positive(), suspended_at: z.string().nullable() }),
  )
  if (installation.suspended_at) throw new GithubError('GITHUB_UNAVAILABLE')
  const id = confirmed(
    await db.rpc('finish_github_connection', {
      requester: userId,
      target_workspace: pending.workspace_id,
      repository: { ...repository, installation_id: installation.id },
    }),
  )
  return { id, workspaceId: pending.workspace_id }
}
