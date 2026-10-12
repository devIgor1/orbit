import { GithubError } from './errors.ts'

export function required(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new GithubError('GITHUB_NOT_CONFIGURED', 503)
  return value
}
export function appOrigin() {
  const url = new URL(required('ORBIT_APP_URL'))
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    throw new GithubError('GITHUB_NOT_CONFIGURED', 503)
  return url.origin
}
export function githubConfiguration() {
  const slug = required('GITHUB_APP_SLUG')
  if (!/^[a-z0-9-]+$/.test(slug)) throw new GithubError('GITHUB_NOT_CONFIGURED', 503)
  for (const name of [
    'GITHUB_APP_ID',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_PRIVATE_KEY_BASE64',
    'GITHUB_WEBHOOK_SECRET',
    'GITHUB_WORKER_SECRET',
  ])
    required(name)
  return {
    installationUrl: `https://github.com/apps/${slug}/installations/new`,
    callbackUrl: `${appOrigin()}/settings/github/callback`,
  }
}
