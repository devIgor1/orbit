import { generateKeyPairSync } from 'node:crypto'
import { z } from 'zod'

export const sandboxUpdate = z.object({
  state: z.enum(['draft', 'open', 'closed', 'merged']).optional(),
  unavailable: z.boolean().optional(),
  uncertainComment: z.boolean().optional(),
  reset: z.boolean().optional(),
})

// This fixture replaces only GitHub HTTP responses. Orbit handlers and SQL run unchanged.
export function createGithubSandbox() {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const secrets: Record<string, string> = {
    GITHUB_APP_ID: '100',
    GITHUB_APP_SLUG: 'orbit-test',
    GITHUB_CLIENT_ID: 'fixture',
    GITHUB_CLIENT_SECRET: 'local-test-client-secret',
    GITHUB_WEBHOOK_SECRET: 'local-test-webhook-secret',
    GITHUB_WORKER_SECRET: 'local-test-worker-secret',
    GITHUB_PRIVATE_KEY_BASE64: Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64'),
  }
  let state = 'draft'
  let unavailable = false
  let uncertainComment = false
  const comments: { id: number; body: string; user: { login: string; type: string } }[] = []
  const repositories = [10, 11].map((id) => ({
    id,
    full_name: `orbit-test/${id === 10 ? 'entregas' : 'segundo-repo'}`,
    default_branch: 'main',
    private: true,
    permissions: { admin: true, push: true },
  }))
  const installation = {
    id: 20,
    app_id: 100,
    suspended_at: null,
    account: { id: 1, login: 'orbit-test', type: 'User' },
    permissions: { contents: 'read', pull_requests: 'write' },
  }
  const snapshot = () => ({ state, unavailable, comments: [...comments] })
  const pull = (repositoryId = 10) => ({
    number: 42,
    title: 'Entrega do fluxo completo',
    state: state === 'merged' || state === 'closed' ? 'closed' : 'open',
    draft: state === 'draft',
    merged_at: state === 'merged' ? '2026-10-13T12:00:00Z' : null,
    closed_at: state === 'merged' || state === 'closed' ? '2026-10-13T12:00:00Z' : null,
    head: {
      ref: 'feat/entrega',
      repo: { id: repositoryId, full_name: repositories.find((r) => r.id === repositoryId)?.full_name },
    },
    base: { ref: 'main', repo: { id: repositoryId } },
  })
  return {
    secrets,
    snapshot,
    update(input: z.infer<typeof sandboxUpdate>) {
      if (input.reset) {
        state = 'draft'
        unavailable = false
        uncertainComment = false
        comments.length = 0
      }
      if (input.state) state = input.state
      if (input.unavailable !== undefined) unavailable = input.unavailable
      if (input.uncertainComment !== undefined) uncertainComment = input.uncertainComment
      return snapshot()
    },
    async fetch(input: string | URL | Request, init?: RequestInit) {
      const url = new URL(input instanceof Request ? input.url : input)
      if (url.hostname === 'github.com' && url.pathname === '/login/oauth/access_token')
        return Response.json({ access_token: 'fixture-oauth-token', token_type: 'bearer' })
      if (url.hostname !== 'api.github.com') throw new Error('Unexpected external host in GitHub test')
      const path = url.pathname
      if (path === '/user') return Response.json({ id: 1, login: 'orbit-test' })
      if (path === '/user/installations') return Response.json({ total_count: 1, installations: [installation] })
      if (path === '/app/installations/20') return Response.json(installation)
      if (path === '/user/installations/20/repositories') return Response.json({ total_count: 2, repositories })
      if (unavailable) return Response.json({ message: 'Access revoked by test' }, { status: 403 })
      if (path.endsWith('/access_tokens')) return Response.json({ token: 'fixture-installation-token' })
      const repo = repositories.find(
        (r) => path === `/repositories/${r.id}` || path.startsWith(`/repos/${r.full_name}`),
      )
      if (!repo) throw new Error(`Unexpected GitHub fixture path: ${path}`)
      if (path.endsWith('/comments')) {
        if (init?.method !== 'POST') return Response.json(comments)
        const comment = {
          id: comments.length + 123,
          body: z.object({ body: z.string() }).parse(JSON.parse(String(init.body))).body,
          user: { login: 'orbit-test[bot]', type: 'Bot' },
        }
        comments.push(comment)
        if (uncertainComment) {
          uncertainComment = false
          throw new TypeError('Test: connection lost after accepted comment')
        }
        return Response.json(comment)
      }
      if (path.endsWith('/pulls/42')) return Response.json(pull(repo.id))
      if (path.endsWith('/pulls')) return Response.json([pull(repo.id)])
      if (path === `/repos/${repo.full_name}` || path === `/repositories/${repo.id}`) return Response.json(repo)
      throw new Error(`Unexpected GitHub fixture path: ${path}`)
    },
  }
}
