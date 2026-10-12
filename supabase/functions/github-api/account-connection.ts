import { z } from 'zod'
import { githubId } from '../_shared/github/contracts.ts'
import { sha256 } from '../_shared/github/crypto.ts'
import { confirmed, type GithubDatabase } from '../_shared/github/database.ts'
import { GithubError } from '../_shared/github/errors.ts'
import { accountRepositories } from './account-repositories.ts'
import { authorizationUrl, exchangeCode } from './oauth.ts'
import { checkStateError, installationUrl, newConnectionState } from './connection-state.ts'

export async function beginAccountConnection(db: GithubDatabase, userId: string, workspaceId: string) {
  const state = newConnectionState('account')
  const { error } = await db.rpc('begin_github_account_connection', {
    requester: userId,
    target_workspace: workspaceId,
    state_hash: await sha256(state),
  })
  if (error) throw error
  return { url: installationUrl(state) }
}

export async function authorizeAccountConnection(
  db: GithubDatabase,
  userId: string,
  state: string,
  installationId: number,
) {
  const next = newConnectionState('account')
  const { error } = await db.rpc('advance_github_account_connection', {
    requester: userId,
    previous_hash: await sha256(state),
    next_hash: await sha256(next),
    target_installation: installationId,
  })
  checkStateError(error)
  return { url: authorizationUrl(next) }
}

export async function completeAccountConnection(db: GithubDatabase, userId: string, state: string, code: string) {
  const result = await db.rpc('consume_github_account_connection', {
    requester: userId,
    state_hash: await sha256(state),
  })
  checkStateError(result.error)
  const pending = z.object({ workspace_id: z.uuid(), installation_id: githubId }).parse(confirmed(result))
  const token = await exchangeCode(code)
  const { repositories, accountLogin, skippedCount } = await accountRepositories(token, pending.installation_id)
  const count = confirmed(
    await db.rpc('finish_github_account_connection', {
      requester: userId,
      target_workspace: pending.workspace_id,
      repositories,
    }),
  )
  if (count !== repositories.length) throw new GithubError('GITHUB_CONTRACT')
  return { workspaceId: pending.workspace_id, repositoryCount: count, accountLogin, skippedCount }
}
