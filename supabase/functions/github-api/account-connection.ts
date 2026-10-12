import { sha256 } from '../_shared/github/crypto.ts'
import { type GithubDatabase } from '../_shared/github/database.ts'
import { authorizationUrl } from './oauth.ts'
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
