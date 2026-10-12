// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  beginInstallationDiscovery,
  discoverInstallations,
  selectInstallation,
} from '../supabase/functions/github-api/installation-discovery'
import { accessibleInstallations } from '../supabase/functions/github-api/accessible-installations'
import { exchangeCode } from '../supabase/functions/github-api/oauth'
import type { GithubDatabase } from '../supabase/functions/_shared/github/database'
import type * as GithubOauth from '../supabase/functions/github-api/oauth'

vi.mock('../supabase/functions/github-api/oauth', async (original) => ({
  ...(await original<typeof GithubOauth>()),
  exchangeCode: vi.fn(async () => 'fixture-user-token'),
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
const workspaceId = 'aa000000-0000-4000-8000-000000000001'
const installation = (id: number, type = 'User') => ({ id, app_id: 7, account: { login: `account-${id}`, type } })
function setup() {
  const secrets: Record<string, string> = {
    GITHUB_APP_ID: '7',
    GITHUB_APP_SLUG: 'orbit-test',
    GITHUB_CLIENT_ID: 'client',
    GITHUB_CLIENT_SECRET: 'fixture',
    GITHUB_PRIVATE_KEY_BASE64: 'fixture',
    GITHUB_WEBHOOK_SECRET: 'fixture',
    GITHUB_WORKER_SECRET: 'fixture',
    ORBIT_APP_URL: 'https://orbit.example.test',
  }
  vi.stubGlobal('Deno', { env: { get: (key: string) => secrets[key] } })
  const rpc = vi.fn().mockResolvedValue({ data: workspaceId, error: null })
  const db = { rpc } as unknown as GithubDatabase
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ total_count: 2, installations: [installation(20), installation(30, 'Organization')] }),
    )
  vi.stubGlobal('fetch', fetcher)
  return { db, rpc, fetcher }
}
describe('installed GitHub App discovery', () => {
  it('starts with identity authorization, not installation settings', async () => {
    const { db, rpc, fetcher } = setup()
    const { url } = await beginInstallationDiscovery(db, 'user', workspaceId)
    const target = new URL(url)
    expect(target.pathname).toBe('/login/oauth/authorize')
    expect(target.searchParams.get('state')).toMatch(/^discover\./)
    expect(rpc).toHaveBeenCalledExactlyOnceWith(
      'begin_github_discovery',
      expect.objectContaining({ requester: 'user', target_workspace: workspaceId }),
    )
    expect(rpc.mock.calls[0][1].state_hash).not.toBe(target.searchParams.get('state'))
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('offers only the OAuth user’s installations and retains no user token', async () => {
    const { db, rpc, fetcher } = setup()
    const result = await discoverInstallations(db, 'user', 'discover.state', 'code')
    expect(result).toEqual({
      status: 'choose',
      state: expect.stringMatching(/^choice\./),
      installations: [
        { id: 20, accountLogin: 'account-20', accountType: 'User' },
        { id: 30, accountLogin: 'account-30', accountType: 'Organization' },
      ],
    })
    expect(fetcher.mock.calls[0][0]).toBe('https://api.github.com/user/installations?per_page=100&page=1')
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer fixture-user-token')
    expect(rpc.mock.calls[1]).toEqual([
      'begin_github_discovery',
      {
        requester: 'user',
        target_workspace: workspaceId,
        state_hash: expect.any(String),
        available_installations: [20, 30],
      },
    ])
    expect(JSON.stringify([rpc.mock.calls, result])).not.toContain('fixture-user-token')
  })
  it('starts installation automatically only after a confirmed empty result', async () => {
    const { db, rpc, fetcher } = setup()
    fetcher.mockResolvedValue(Response.json({ total_count: 0, installations: [] }))
    const result = await discoverInstallations(db, 'user', 'discover.state', 'code')
    expect(result).toMatchObject({
      status: 'redirect',
      url: expect.stringMatching(/^https:\/\/github.com\/apps\/orbit-test\/installations\/new\?state=account\./),
    })
    expect(rpc.mock.calls[1][0]).toBe('begin_github_account_connection')
  })
  it.each(['existing', 'another'] as const)('rotates choice state for %s account', async (kind) => {
    const { db, rpc, fetcher } = setup()
    const id = kind === 'existing' ? 20 : null
    const { url } = await selectInstallation(db, 'user', 'choice.state', id)
    expect(new URL(url).pathname).toBe(
      kind === 'existing' ? '/login/oauth/authorize' : '/apps/orbit-test/installations/new',
    )
    expect(new URL(url).searchParams.get('state')).toMatch(/^account\./)
    expect(rpc).toHaveBeenCalledExactlyOnceWith(
      'select_github_installation',
      expect.objectContaining({ requester: 'user', ...(id === null ? {} : { target_installation: id }) }),
    )
    expect(fetcher).not.toHaveBeenCalled()
  })
  it.each(['22023', '42501'])('refuses invalid discovery and selection before GitHub access (%s)', async (code) => {
    const { db, rpc, fetcher } = setup()
    rpc.mockResolvedValue({ data: null, error: { code } })
    const expected = code === '22023' ? 'GITHUB_STATE_INVALID' : code
    await expect(discoverInstallations(db, 'user', 'state', 'code')).rejects.toMatchObject({ code: expected })
    await expect(selectInstallation(db, 'user', 'state', 999)).rejects.toMatchObject({ code: expected })
    expect(exchangeCode).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it.each(['unavailable', 'malformed', 'foreign-app', 'partial', 'too-many'])(
    'does not turn %s discovery into a new installation',
    async (kind) => {
      const { db, rpc, fetcher } = setup()
      fetcher.mockResolvedValue(
        kind === 'unavailable'
          ? new Response(null, { status: 403 })
          : Response.json(
              kind === 'malformed'
                ? {}
                : {
                    total_count: kind === 'too-many' ? 1001 : kind === 'partial' ? 2 : 1,
                    installations: [{ ...installation(20), ...(kind === 'foreign-app' ? { app_id: 999 } : {}) }],
                  },
            ),
      )
      await expect(discoverInstallations(db, 'user', 'state', 'code')).rejects.toHaveProperty('code')
      expect(rpc).toHaveBeenCalledTimes(1)
    },
  )
  it('paginates installations and checks consistency before offering a choice', async () => {
    const { fetcher } = setup()
    fetcher
      .mockReset()
      .mockResolvedValueOnce(
        Response.json({ total_count: 101, installations: Array.from({ length: 100 }, (_, i) => installation(i + 1)) }),
      )
      .mockResolvedValueOnce(Response.json({ total_count: 101, installations: [installation(101)] }))
    expect(await accessibleInstallations('fixture-user-token')).toHaveLength(101)
    expect(fetcher.mock.calls[1][0]).toContain('page=2')
  })
  it('does not show choices when their persistence fails', async () => {
    const { db, rpc } = setup()
    rpc
      .mockReset()
      .mockResolvedValueOnce({ data: workspaceId, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '42501' } })
    await expect(discoverInstallations(db, 'user', 'state', 'code')).rejects.toMatchObject({ code: '42501' })
  })
})
