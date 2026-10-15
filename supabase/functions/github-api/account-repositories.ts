import { z } from 'zod'
import { appToken, githubRequest } from '../_shared/github/client.ts'
import { canConnectRepository, githubId, repositoryPermissions, repositorySchema } from '../_shared/github/contracts.ts'
import { required } from '../_shared/github/config.ts'
import { GithubError } from '../_shared/github/errors.ts'
import { accessibleInstallations } from './accessible-installations.ts'

const accessibleRepository = repositorySchema.extend({ permissions: repositoryPermissions })
const pageSchema = z.object({
  total_count: z.number().int().nonnegative(),
  repositories: z.array(accessibleRepository),
})
type AccessibleRepository = z.infer<typeof accessibleRepository>

export async function accountRepositories(userToken: string, installationId: number) {
  // A spoofed setup URL cannot confer access: both the App and the OAuth user
  // must have each installation, and each imported repository requires write access.
  const accountLogin = await verifiedInstallation(installationId)
  const own = await installationRepositories(userToken, installationId)
  // Repositories where the user collaborates live in their owners' installations.
  const others = (await accessibleInstallations(userToken)).filter(({ id }) => id !== installationId)
  const collaborations = await Promise.all(others.map(({ id }) => collaboratorRepositories(userToken, id)))

  const allowed = new Map<number, AccessibleRepository & { installation_id: number }>()
  for (const repo of own)
    if (canConnectRepository(repo.permissions)) allowed.set(repo.id, { ...repo, installation_id: installationId })
  others.forEach(({ id }, index) => {
    for (const repo of collaborations[index])
      if (!allowed.has(repo.id)) allowed.set(repo.id, { ...repo, installation_id: id })
  })
  if (!allowed.size) throw new GithubError('GITHUB_NO_WRITABLE_REPOSITORIES', 403)
  if (allowed.size > 1000) throw new GithubError('GITHUB_REPOSITORY_LIMIT', 400)
  return {
    accountLogin,
    skippedCount: own.filter((repo) => !canConnectRepository(repo.permissions)).length,
    repositories: [...allowed.values()].map((repo) => ({
      ...repositorySchema.parse(repo),
      installation_id: repo.installation_id,
    })),
  }
}

async function collaboratorRepositories(userToken: string, installationId: number) {
  // An incomplete listing must remain an error, including during the final access recheck.
  await verifiedInstallation(installationId)
  return (await installationRepositories(userToken, installationId)).filter((repo) =>
    canConnectRepository(repo.permissions),
  )
}

async function verifiedInstallation(installationId: number) {
  const installation = await githubRequest(
    await appToken(),
    `/app/installations/${installationId}`,
    z.object({
      id: githubId,
      app_id: githubId,
      suspended_at: z.string().nullable(),
      account: z.object({ login: z.string().min(1) }),
      permissions: z.object({ contents: z.string(), pull_requests: z.string() }),
    }),
  )
  if (
    installation.id !== installationId ||
    String(installation.app_id) !== required('GITHUB_APP_ID') ||
    installation.suspended_at ||
    !['read', 'write'].includes(installation.permissions.contents) ||
    installation.permissions.pull_requests !== 'write'
  )
    throw new GithubError('GITHUB_UNAVAILABLE', 403)
  return installation.account.login
}

async function installationRepositories(userToken: string, installationId: number) {
  const repositories = new Map<number, AccessibleRepository>()
  for (let page = 1; page <= 10; page++) {
    const result = await githubRequest(
      userToken,
      `/user/installations/${installationId}/repositories?per_page=100&page=${page}`,
      pageSchema,
    )
    if (result.total_count > 1000) throw new GithubError('GITHUB_REPOSITORY_LIMIT', 400)
    for (const repo of result.repositories) repositories.set(repo.id, repo)
    if (result.repositories.length < 100 || page * 100 >= result.total_count) {
      if (repositories.size !== result.total_count) throw new GithubError('GITHUB_CONTRACT')
      return [...repositories.values()]
    }
  }
  throw new GithubError('GITHUB_REPOSITORY_LIMIT', 400)
}
