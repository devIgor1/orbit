import { githubConfiguration } from '../_shared/github/config.ts'
import { GithubError } from '../_shared/github/errors.ts'

export const newConnectionState = (phase: 'account' | 'discover' | 'choice' | 'selection' | 'repositories') =>
  `${phase}.${crypto.randomUUID()}${crypto.randomUUID()}`

export function checkStateError(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error && error.code === '22023')
    throw new GithubError('GITHUB_STATE_INVALID', 400)
  if (error) throw error
}

export function installationUrl(state: string) {
  const url = new URL(githubConfiguration().installationUrl)
  url.searchParams.set('state', state)
  return url.href
}
