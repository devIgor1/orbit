import { z } from 'zod'
import { githubId } from '../_shared/github/contracts.ts'
import { sha256 } from '../_shared/github/crypto.ts'
import { confirmed, type GithubDatabase } from '../_shared/github/database.ts'
import { GithubError } from '../_shared/github/errors.ts'
import { accountRepositories } from './account-repositories.ts'
import { checkStateError, newConnectionState } from './connection-state.ts'
import { authorizationUrl, exchangeCode } from './oauth.ts'

export async function prepareRepositorySelection(db: GithubDatabase, userId: string, state: string, code: string) {
  const result = await db.rpc('consume_github_account_connection', {
    requester: userId,
    state_hash: await sha256(state),
  })
  checkStateError(result.error)
  const pending = z.object({ workspace_id: z.uuid(), installation_id: githubId }).parse(confirmed(result))
  const { repositories, accountLogin, skippedCount } = await accountRepositories(
    await exchangeCode(code),
    pending.installation_id,
  )
  const next = newConnectionState('selection')
  const snapshot = z.object({ connected_ids: z.array(githubId), in_use_ids: z.array(githubId) }).parse(
    confirmed(
      await db.rpc('begin_github_repository_selection', {
        requester: userId,
        target_workspace: pending.workspace_id,
        target_installation: pending.installation_id,
        state_hash: await sha256(next),
        available_repositories: repositories.map(({ id }) => id),
      }),
    ),
  )
  return {
    status: 'repositories' as const,
    state: next,
    accountLogin,
    skippedCount,
    repositories: repositories
      .map((repo) => ({
        id: repo.id,
        fullName: repo.full_name,
        isPrivate: repo.private,
        connected: snapshot.connected_ids.includes(repo.id),
        inUse: snapshot.in_use_ids.includes(repo.id),
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
  }
}

export async function selectRepositories(db: GithubDatabase, userId: string, state: string, repositoryIds: number[]) {
  const next = newConnectionState('repositories')
  const { error } = await db.rpc('select_github_repositories', {
    requester: userId,
    state_hash: await sha256(state),
    next_hash: await sha256(next),
    repository_ids: repositoryIds,
  })
  checkStateError(error)
  return { url: authorizationUrl(next) }
}

export async function completeRepositorySelection(db: GithubDatabase, userId: string, state: string, code: string) {
  const result = await db.rpc('consume_github_repository_selection', {
    requester: userId,
    state_hash: await sha256(state),
  })
  checkStateError(result.error)
  const pending = z
    .object({
      workspace_id: z.uuid(),
      installation_id: githubId,
      selected_ids: z.array(githubId).min(1).max(1000),
      previous_ids: z.array(githubId).max(1000),
    })
    .parse(confirmed(result))
  const { repositories, accountLogin } = await accountRepositories(await exchangeCode(code), pending.installation_id)
  const selected = repositories.filter(({ id }) => pending.selected_ids.includes(id))
  if (selected.length !== pending.selected_ids.length) throw new GithubError('GITHUB_SELECTION_CHANGED', 403)
  const saved = await db.rpc('save_github_repository_selection', {
    requester: userId,
    target_workspace: pending.workspace_id,
    target_installation: pending.installation_id,
    repositories: selected,
    previous_ids: pending.previous_ids,
  })
  if (saved.error?.code === '55000') throw new GithubError('GITHUB_REPOSITORY_IN_USE', 409)
  const count = confirmed(saved)
  if (count !== selected.length) throw new GithubError('GITHUB_CONTRACT')
  return { workspaceId: pending.workspace_id, repositoryCount: count, accountLogin, skippedCount: 0 }
}
