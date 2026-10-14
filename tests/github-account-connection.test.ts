// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { beginAccountConnection, authorizeAccountConnection } from '../supabase/functions/github-api/account-connection'
import { completeRepositorySelection } from '../supabase/functions/github-api/repository-selection'
import type { GithubDatabase } from '../supabase/functions/_shared/github/database'
import type * as GithubClient from '../supabase/functions/_shared/github/client'

vi.mock('../supabase/functions/_shared/github/client', async (importOriginal) => ({
  ...(await importOriginal<typeof GithubClient>()),
  appToken: async () => 'fixture-app-token',
}))
afterEach(() => vi.unstubAllGlobals())
const workspaceId = 'aa000000-0000-4000-8000-000000000001'
const repo = (id = 10, admin = true, push = admin) => ({
  id,
  full_name: `org/repo-${id}`,
  default_branch: 'main',
  private: true,
  permissions: { admin, push },
})
function setup() {
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({
      data: { workspace_id: workspaceId, installation_id: 20, selected_ids: [10], previous_ids: [] },
      error: null,
    })
    .mockResolvedValueOnce({ data: 1, error: null })
  // Only RPC is needed by this unit. SQL tests verify its actual authorization.
  const db = { rpc } as unknown as GithubDatabase
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
  vi.stubGlobal('Deno', { env: { get: (name: string) => secrets[name] } })
  const installation = {
    id: 20,
    app_id: 7,
    suspended_at: null,
    account: { login: 'org' },
    permissions: { contents: 'read', pull_requests: 'write' },
  }
  // GitHub as seen by the App (installations) and by the OAuth user (visible, repositories pages).
  const github = {
    installations: { 20: installation } as Record<number, object>,
    visible: [{ id: 20, app_id: 7, account: { id: 1, login: 'org', type: 'Organization' } }],
    repositories: { 20: [{ total_count: 2, repositories: [repo(), repo(11, false)] }] } as Record<
      number,
      (object | Response)[]
    >,
  }
  const fetcher = vi.fn(async (input: string) => {
    const url = new URL(input)
    if (url.pathname === '/login/oauth/access_token') return Response.json({ access_token: 'fixture-user-token' })
    if (url.pathname === '/user/installations')
      return Response.json({ total_count: github.visible.length, installations: github.visible })
    const app = url.pathname.match(/^\/app\/installations\/(\d+)$/)
    const repos = url.pathname.match(/^\/user\/installations\/(\d+)\/repositories$/)
    const body = app
      ? github.installations[Number(app[1])]
      : repos && github.repositories[Number(repos[1])]?.[Number(url.searchParams.get('page')) - 1]
    if (!body) return new Response(null, { status: 404 })
    return body instanceof Response ? body : Response.json(body)
  })
  vi.stubGlobal('fetch', fetcher)
  return { db, rpc, fetcher, installation, github }
}
describe('GitHub account connection', () => {
  it('starts one GitHub consent flow without asking for a repository name', async () => {
    const { db, rpc, fetcher } = setup()
    rpc.mockReset().mockResolvedValue({ error: null })
    const result = await beginAccountConnection(db, 'orbit-user', workspaceId)
    const url = new URL(result.url)
    expect(url.origin + url.pathname).toBe('https://github.com/apps/orbit-test/installations/new')
    expect(url.searchParams.get('state')).toMatch(/^account\./)
    expect(rpc.mock.calls[0]).toEqual([
      'begin_github_account_connection',
      {
        requester: 'orbit-user',
        target_workspace: workspaceId,
        state_hash: expect.any(String),
      },
    ])
    expect(rpc.mock.calls[0][1].state_hash).not.toBe(url.searchParams.get('state'))
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('rotates the setup state before OAuth and does not connect from an installation ID alone', async () => {
    const { db, rpc, fetcher } = setup()
    rpc.mockReset().mockResolvedValue({ error: null })
    const result = await authorizeAccountConnection(db, 'orbit-user', 'account.initial', 20)
    const url = new URL(result.url)
    expect(url.pathname).toBe('/login/oauth/authorize')
    expect(url.searchParams.get('state')).not.toBe('account.initial')
    expect(url.searchParams.get('redirect_uri')).toBe('https://orbit.example.test/settings/github/callback')
    expect(rpc).toHaveBeenCalledExactlyOnceWith(
      'advance_github_account_connection',
      expect.objectContaining({ target_installation: 20 }),
    )
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('imports only repositories the OAuth user can write to, into the original workspace', async () => {
    const { db, rpc, fetcher } = setup()
    expect(await completeRepositorySelection(db, 'orbit-user', 'account.state', 'code')).toEqual({
      workspaceId,
      repositoryCount: 1,
      accountLogin: 'org',
      skippedCount: 0,
    })
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer fixture-app-token')
    expect(fetcher.mock.calls[2][0]).toBe(
      'https://api.github.com/user/installations/20/repositories?per_page=100&page=1',
    )
    expect(fetcher.mock.calls[2][1].headers.Authorization).toBe('Bearer fixture-user-token')
    expect(rpc.mock.calls[1]).toEqual([
      'save_github_repository_selection',
      {
        requester: 'orbit-user',
        target_workspace: workspaceId,
        target_installation: 20,
        previous_ids: [],
        repositories: [
          { id: 10, full_name: 'org/repo-10', default_branch: 'main', private: true, installation_id: 20 },
        ],
      },
    ])
  })
  it('imports repositories where the OAuth user is a collaborator with write access', async () => {
    const { db, rpc, github } = setup()
    github.repositories[20] = [{ total_count: 1, repositories: [repo(10, false, true)] }]
    expect(await completeRepositorySelection(db, 'orbit-user', 'account.state', 'code')).toMatchObject({
      repositoryCount: 1,
    })
    expect(rpc.mock.calls[1][1].repositories).toEqual([
      { id: 10, full_name: 'org/repo-10', default_branch: 'main', private: true, installation_id: 20 },
    ])
  })
  it('adds writable repositories from installations owned by other accounts', async () => {
    const { db, rpc, installation, github } = setup()
    github.visible.push({ id: 40, app_id: 7, account: { id: 2, login: 'owner', type: 'User' } })
    github.installations[40] = { ...installation, id: 40, account: { login: 'owner' } }
    github.repositories[40] = [{ total_count: 2, repositories: [repo(77, false, true), repo(78, false)] }]
    rpc.mockReset().mockResolvedValueOnce({
      data: { workspace_id: workspaceId, installation_id: 20, selected_ids: [10, 77], previous_ids: [] },
      error: null,
    })
    rpc.mockResolvedValueOnce({ data: 2, error: null })
    await expect(completeRepositorySelection(db, 'orbit-user', 'state', 'code')).resolves.toMatchObject({
      repositoryCount: 2,
      accountLogin: 'org',
    })
    expect(rpc.mock.calls[1][1]).toMatchObject({
      target_installation: 20,
      repositories: [
        { id: 10, installation_id: 20 },
        { id: 77, full_name: 'org/repo-77', installation_id: 40 },
      ],
    })
  })
  it('ignores another owner’s unavailable installation instead of failing', async () => {
    const { db, rpc, installation, github } = setup()
    github.visible.push({ id: 40, app_id: 7, account: { id: 2, login: 'owner', type: 'User' } })
    github.installations[40] = { ...installation, id: 40, suspended_at: '2026-10-12T00:00:00Z' }
    await expect(completeRepositorySelection(db, 'orbit-user', 'state', 'code')).resolves.toMatchObject({
      repositoryCount: 1,
    })
    expect(rpc.mock.calls[1][1].repositories).toEqual([expect.objectContaining({ id: 10, installation_id: 20 })])
  })
  it('rejects an expired or foreign state before using the OAuth code', async () => {
    const { db, rpc, fetcher } = setup()
    rpc.mockReset().mockResolvedValue({ data: null, error: { code: '22023' } })
    await expect(completeRepositorySelection(db, 'orbit-user', 'state', 'code')).rejects.toMatchObject({
      code: 'GITHUB_STATE_INVALID',
      status: 400,
    })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('asks to restart an invalid setup state and preserves permission failures', async () => {
    const { db, rpc, fetcher } = setup()
    rpc.mockReset().mockResolvedValue({ data: null, error: { code: '22023' } })
    await expect(authorizeAccountConnection(db, 'orbit-user', 'state', 20)).rejects.toMatchObject({
      code: 'GITHUB_STATE_INVALID',
      status: 400,
    })
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } })
    await expect(authorizeAccountConnection(db, 'orbit-user', 'state', 20)).rejects.toMatchObject({ code: '42501' })
    await expect(completeRepositorySelection(db, 'orbit-user', 'state', 'code')).rejects.toMatchObject({
      code: '42501',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('refuses an installation that the GitHub user cannot access, even if the App can', async () => {
    const { db, rpc, github } = setup()
    github.repositories[20] = []
    await expect(completeRepositorySelection(db, 'orbit-user', 'state', 'code')).rejects.toMatchObject({
      code: 'GITHUB_UNAVAILABLE',
    })
    expect(rpc).toHaveBeenCalledTimes(1)
  })
  it.each(['wrong-app', 'suspended', 'missing-permission'])('rejects a %s installation', async (kind) => {
    const { db, rpc, installation, github } = setup()
    github.installations[20] = {
      ...installation,
      ...(kind === 'wrong-app'
        ? { app_id: 999 }
        : kind === 'suspended'
          ? { suspended_at: '2026-10-12T00:00:00Z' }
          : { permissions: { contents: 'read', pull_requests: 'read' } }),
    }
    await expect(completeRepositorySelection(db, 'orbit-user', 'state', 'code')).rejects.toMatchObject({
      code: 'GITHUB_UNAVAILABLE',
    })
    expect(rpc).toHaveBeenCalledTimes(1)
  })
  it('paginates before committing all repositories together', async () => {
    const { db, rpc, fetcher, github } = setup()
    github.repositories[20] = [
      { total_count: 101, repositories: Array.from({ length: 100 }, (_, i) => repo(i + 1)) },
      { total_count: 101, repositories: [repo(101)] },
    ]
    rpc
      .mockReset()
      .mockResolvedValueOnce({
        data: {
          workspace_id: workspaceId,
          installation_id: 20,
          selected_ids: Array.from({ length: 101 }, (_, i) => i + 1),
          previous_ids: [],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: 101, error: null })
    await expect(completeRepositorySelection(db, 'orbit-user', 'state', 'code')).resolves.toMatchObject({
      repositoryCount: 101,
    })
    expect(fetcher.mock.calls[3][0]).toContain('page=2')
    expect(rpc.mock.calls[1][1].repositories).toHaveLength(101)
  })
  it.each(['empty', 'read-only', 'incomplete', 'too-many'])('does not report success for %s results', async (kind) => {
    const { db, rpc, github } = setup()
    const data =
      kind === 'empty'
        ? { total_count: 0, repositories: [] }
        : kind === 'read-only'
          ? { total_count: 1, repositories: [repo(10, false)] }
          : { total_count: kind === 'too-many' ? 1001 : 2, repositories: [repo()] }
    github.repositories[20] = [data]
    await expect(completeRepositorySelection(db, 'orbit-user', 'state', 'code')).rejects.toHaveProperty('code')
    expect(rpc).toHaveBeenCalledTimes(1)
  })
  it('does not turn a refused database write into a successful connection', async () => {
    const { db, rpc } = setup()
    rpc
      .mockReset()
      .mockResolvedValueOnce({
        data: { workspace_id: workspaceId, installation_id: 20, selected_ids: [10], previous_ids: [] },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { code: '42501' } })
    await expect(completeRepositorySelection(db, 'orbit-user', 'state', 'code')).rejects.toMatchObject({
      code: '42501',
    })
  })
})
