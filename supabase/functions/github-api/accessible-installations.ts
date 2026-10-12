import { z } from 'zod'
import { githubRequest } from '../_shared/github/client.ts'
import { required } from '../_shared/github/config.ts'
import { githubId } from '../_shared/github/contracts.ts'
import { GithubError } from '../_shared/github/errors.ts'

const installationSchema = z.object({
  id: githubId,
  app_id: githubId,
  account: z.object({ login: z.string().min(1), type: z.enum(['User', 'Organization']) }),
})
const pageSchema = z.object({
  total_count: z.number().int().nonnegative(),
  installations: z.array(installationSchema),
})

export async function accessibleInstallations(userToken: string) {
  // Use the OAuth user's view, never the App-wide installation directory.
  const installations = new Map<number, z.infer<typeof installationSchema>>()
  for (let page = 1; page <= 10; page++) {
    const result = await githubRequest(userToken, `/user/installations?per_page=100&page=${page}`, pageSchema)
    if (result.total_count > 1000) throw new GithubError('GITHUB_INSTALLATION_LIMIT', 400)
    for (const installation of result.installations) {
      if (String(installation.app_id) !== required('GITHUB_APP_ID')) throw new GithubError('GITHUB_CONTRACT')
      installations.set(installation.id, installation)
    }
    if (result.installations.length < 100 || page * 100 >= result.total_count) {
      if (installations.size !== result.total_count) throw new GithubError('GITHUB_CONTRACT')
      return [...installations.values()]
        .map(({ id, account }) => ({ id, accountLogin: account.login, accountType: account.type }))
        .sort((a, b) => a.accountLogin.localeCompare(b.accountLogin))
    }
  }
  throw new GithubError('GITHUB_INSTALLATION_LIMIT', 400)
}
