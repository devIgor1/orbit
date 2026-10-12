import { z } from 'zod'
import { sha256 } from '../_shared/github/crypto.ts'
import { confirmed, type GithubDatabase } from '../_shared/github/database.ts'
import { accessibleInstallations } from './accessible-installations.ts'
import { beginAccountConnection } from './account-connection.ts'
import { checkStateError, installationUrl, newConnectionState } from './connection-state.ts'
import { authorizationUrl, exchangeCode } from './oauth.ts'

export async function beginInstallationDiscovery(db: GithubDatabase, userId: string, workspaceId: string) {
  const state = newConnectionState('discover')
  const { error } = await db.rpc('begin_github_discovery', {
    requester: userId,
    target_workspace: workspaceId,
    state_hash: await sha256(state),
  })
  if (error) throw error
  return { url: authorizationUrl(state) }
}

export async function discoverInstallations(db: GithubDatabase, userId: string, state: string, code: string) {
  const result = await db.rpc('consume_github_discovery', { requester: userId, state_hash: await sha256(state) })
  checkStateError(result.error)
  const workspaceId = z.uuid().parse(confirmed(result))
  const installations = await accessibleInstallations(await exchangeCode(code))
  if (!installations.length)
    return { status: 'redirect' as const, ...(await beginAccountConnection(db, userId, workspaceId)) }

  const next = newConnectionState('choice')
  const { error } = await db.rpc('begin_github_discovery', {
    requester: userId,
    target_workspace: workspaceId,
    state_hash: await sha256(next),
    available_installations: installations.map(({ id }) => id),
  })
  if (error) throw error
  return { status: 'choose' as const, state: next, installations }
}

export async function selectInstallation(
  db: GithubDatabase,
  userId: string,
  state: string,
  installationId: number | null,
) {
  const next = newConnectionState('account')
  const { error } = await db.rpc('select_github_installation', {
    requester: userId,
    state_hash: await sha256(state),
    next_hash: await sha256(next),
    ...(installationId === null ? {} : { target_installation: installationId }),
  })
  checkStateError(error)
  return { url: installationId === null ? installationUrl(next) : authorizationUrl(next) }
}
