import { z } from 'zod'
import { appToken, githubRequest } from '../_shared/github/client.ts'
import { canConnectRepository, githubId, repositoryPermissions, repositorySchema } from '../_shared/github/contracts.ts'
import { required } from '../_shared/github/config.ts'
import { GithubError } from '../_shared/github/errors.ts'

const accessibleRepository = repositorySchema.extend({ permissions: repositoryPermissions })
const pageSchema = z.object({
  total_count: z.number().int().nonnegative(),
  repositories: z.array(accessibleRepository),
})

export async function accountRepositories(userToken: string, installationId: number) {
  // A spoofed setup URL cannot confer access: both the App and the OAuth user
  // must have this installation, and each imported repository requires write access.
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

  const repositories = new Map<number, z.infer<typeof accessibleRepository>>()
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
      const allowed = [...repositories.values()].filter((repo) => canConnectRepository(repo.permissions))
      if (!allowed.length) throw new GithubError('GITHUB_NO_WRITABLE_REPOSITORIES', 403)
      return {
        accountLogin: installation.account.login,
        skippedCount: repositories.size - allowed.length,
        repositories: allowed.map((repo) => ({ ...repositorySchema.parse(repo), installation_id: installationId })),
      }
    }
  }
  throw new GithubError('GITHUB_REPOSITORY_LIMIT', 400)
}
