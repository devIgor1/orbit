import { z } from 'zod'
import { appOrigin, githubConfiguration, required } from '../_shared/github/config.ts'
import { appToken, githubRequest, repositoryPath } from '../_shared/github/client.ts'
import { repositorySchema } from '../_shared/github/contracts.ts'
import { sha256 } from '../_shared/github/crypto.ts'
import { confirmed, type GithubDatabase } from '../_shared/github/database.ts'
import { GithubError } from '../_shared/github/errors.ts'

export async function beginConnection(db: GithubDatabase, userId: string, workspaceId: string, repository: string) {
  const { callbackUrl } = githubConfiguration()
  const state = crypto.randomUUID() + crypto.randomUUID()
  const { error } = await db.rpc('begin_github_connection', {
    requester: userId,
    target_workspace: workspaceId,
    repository_name: repository,
    state_hash: await sha256(state),
  })
  if (error) throw error
  const url = new URL('https://github.com/login/oauth/authorize')
  url.search = new URLSearchParams({
    client_id: required('GITHUB_CLIENT_ID'),
    redirect_uri: callbackUrl,
    state,
  }).toString()
  return { url: url.href }
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
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: required('GITHUB_CLIENT_ID'),
      client_secret: required('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: `${appOrigin()}/settings/github/callback`,
    }),
  })
  if (!response.ok) throw new GithubError('GITHUB_OAUTH_FAILED')
  const result = z.object({ access_token: z.string().min(1) }).safeParse(await response.json())
  if (!result.success) throw new GithubError('GITHUB_OAUTH_FAILED')
  // User token proves GitHub authority; an installation ID from the browser never does.
  const repository = await githubRequest(
    result.data.access_token,
    repositoryPath(pending.repository_name),
    repositorySchema,
  )
  const user = await githubRequest(result.data.access_token, '/user', z.object({ login: z.string(), id: z.number() }))
  const permission = await githubRequest(
    result.data.access_token,
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
