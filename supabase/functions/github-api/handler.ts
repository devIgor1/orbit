import { githubConfiguration } from '../_shared/github/config.ts'
import { requestSchema } from '../_shared/github/contracts.ts'
import { adminClient, authenticate } from '../_shared/github/database.ts'
import { githubFailure, GithubError } from '../_shared/github/errors.ts'
import { beginConnection, completeConnection } from './connection.ts'
import { linkTask } from './link.ts'
import { beginAccountConnection, authorizeAccountConnection } from './account-connection.ts'
import { prepareRepositorySelection, selectRepositories, completeRepositorySelection } from './repository-selection.ts'
import { listTaskReferences } from './references.ts'
import { beginInstallationDiscovery, discoverInstallations, selectInstallation } from './installation-discovery.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export async function handleGithubApi(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  const respond = (body: object, status = 200) => Response.json(body, { status, headers: cors })
  if (request.method !== 'POST') return respond({ code: 'METHOD_NOT_ALLOWED' }, 405)
  try {
    const db = adminClient()
    const userId = await authenticate(request, db)
    const raw = await request.text()
    if (raw.length > 20000) throw new GithubError('INVALID_REQUEST', 400)
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      throw new GithubError('INVALID_REQUEST', 400)
    }
    const parsed = requestSchema.safeParse(json)
    if (!parsed.success) throw new GithubError('INVALID_REQUEST', 400)
    const input = parsed.data
    if (input.action === 'config') {
      try {
        return respond({ configured: true, ...githubConfiguration() })
      } catch (error) {
        if (error instanceof GithubError && error.code === 'GITHUB_NOT_CONFIGURED')
          return respond({ configured: false })
        throw error
      }
    }
    if (input.action === 'references') return respond(await listTaskReferences(db, userId, input))
    if (input.action === 'discover-account')
      return respond(await beginInstallationDiscovery(db, userId, input.workspaceId))
    if (input.action === 'discovery-callback')
      return respond(await discoverInstallations(db, userId, input.state, input.code))
    if (input.action === 'select-installation')
      return respond(await selectInstallation(db, userId, input.state, input.installationId))
    if (input.action === 'connect-account') return respond(await beginAccountConnection(db, userId, input.workspaceId))
    if (input.action === 'installation-callback')
      return respond(await authorizeAccountConnection(db, userId, input.state, input.installationId))
    // Stale frontends must never perform the former automatic bulk import.
    if (input.action === 'account-callback') throw new GithubError('GITHUB_SELECTION_REQUIRED', 409)
    if (input.action === 'prepare-repositories')
      return respond(await prepareRepositorySelection(db, userId, input.state, input.code))
    if (input.action === 'select-repositories')
      return respond(await selectRepositories(db, userId, input.state, input.repositoryIds))
    if (input.action === 'repositories-callback')
      return respond(await completeRepositorySelection(db, userId, input.state, input.code))
    if (input.action === 'connect')
      return respond(await beginConnection(db, userId, input.workspaceId, input.repository))
    if (input.action === 'callback') return respond(await completeConnection(db, userId, input.state, input.code))
    return respond(await linkTask(db, userId, input))
  } catch (error) {
    const failure = githubFailure(error)
    console.error('github-api', { code: failure.code })
    return respond({ code: failure.code }, failure.status)
  }
}
