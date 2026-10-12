import { z } from 'zod'
import { appOrigin, required } from '../_shared/github/config.ts'
import { GithubError } from '../_shared/github/errors.ts'

export function authorizationUrl(state: string) {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.search = new URLSearchParams({
    client_id: required('GITHUB_CLIENT_ID'),
    redirect_uri: `${appOrigin()}/settings/github/callback`,
    state,
  }).toString()
  return url.href
}

export async function exchangeCode(code: string) {
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
  return result.data.access_token
}
