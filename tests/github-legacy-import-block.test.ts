// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { handleGithubApi } from '../supabase/functions/github-api/handler'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../supabase/functions/_shared/github/database', () => ({
  adminClient: () => ({ rpc }),
  authenticate: async () => 'user',
  confirmed: vi.fn(),
  requireMember: vi.fn(),
}))
it('blocks the former bulk import action even when an old frontend is still open', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  try {
    const response = await handleGithubApi(
      new Request('https://example.test', {
        method: 'POST',
        body: JSON.stringify({ action: 'account-callback', state: 'a'.repeat(64), code: 'code' }),
      }),
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ code: 'GITHUB_SELECTION_REQUIRED' })
    expect(rpc).not.toHaveBeenCalled()
  } finally {
    log.mockRestore()
  }
})
