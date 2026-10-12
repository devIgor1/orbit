import { z } from 'zod'
import { GithubError } from './errors.ts'
import { appJwt } from './crypto.ts'
import { required } from './config.ts'

export async function githubRequest<T>(
  token: string,
  path: string,
  schema: z.ZodType<T>,
  body?: object,
  fetcher = fetch,
): Promise<T> {
  const response = await fetcher(`https://api.github.com${path}`, {
    method: body ? 'POST' : 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok)
    throw new GithubError(
      response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')
        ? 'GITHUB_RATE_LIMIT'
        : [401, 403, 404].includes(response.status)
          ? 'GITHUB_UNAVAILABLE'
          : 'GITHUB_FAILED',
    )
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) throw new GithubError('GITHUB_CONTRACT')
  return parsed.data
}
export async function appToken() {
  return appJwt(required('GITHUB_APP_ID'), atob(required('GITHUB_PRIVATE_KEY_BASE64')))
}
export async function installationToken(installation: number, repository: number) {
  const result = await githubRequest(
    await appToken(),
    `/app/installations/${installation}/access_tokens`,
    z.object({ token: z.string().min(1) }),
    { repository_ids: [repository], permissions: { contents: 'read', pull_requests: 'write' } },
  )
  return result.token
}
export function repositoryPath(fullName: string) {
  return `/repos/${fullName.split('/').map(encodeURIComponent).join('/')}`
}
