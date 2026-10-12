export class GithubError extends Error {
  constructor(
    readonly code: string,
    readonly status = 502,
  ) {
    super(code)
  }
}
export function githubFailure(error: unknown) {
  if (error instanceof GithubError) return error
  if (typeof error === 'object' && error && 'code' in error) {
    if (error.code === '42501' || error.code === 'PGRST116') return new GithubError('FORBIDDEN', 403)
    if (error.code === '23505') return new GithubError('ALREADY_LINKED', 409)
    if (error.code === '22023') return new GithubError('INVALID_REQUEST', 400)
  }
  return new GithubError('GITHUB_FAILED', 503)
}
