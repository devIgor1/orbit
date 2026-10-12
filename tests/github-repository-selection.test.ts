// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  prepareRepositorySelection,
  selectRepositories,
  completeRepositorySelection,
} from '../supabase/functions/github-api/repository-selection'
import { accountRepositories } from '../supabase/functions/github-api/account-repositories'
import { exchangeCode } from '../supabase/functions/github-api/oauth'
import { requestSchema } from '../supabase/functions/_shared/github/contracts'
import type { GithubDatabase } from '../supabase/functions/_shared/github/database'

vi.mock('../supabase/functions/github-api/account-repositories', () => ({ accountRepositories: vi.fn() }))
vi.mock('../supabase/functions/github-api/oauth', () => ({
  exchangeCode: vi.fn(async () => 'fixture-token'),
  authorizationUrl: (state: string) => `https://github.com/login/oauth/authorize?state=${state}`,
}))
afterEach(() => vi.clearAllMocks())
const workspaceId = 'aa000000-0000-4000-8000-000000000001'
const repositories = [10, 11, 12].map((id) => ({
  id,
  installation_id: 20,
  full_name: `org/repo-${id}`,
  default_branch: 'main',
  private: true,
}))
function setup() {
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({
      data: { workspace_id: workspaceId, installation_id: 20, selected_ids: [11], previous_ids: [10, 12] },
      error: null,
    })
  vi.mocked(accountRepositories).mockResolvedValue({ repositories, accountLogin: 'org', skippedCount: 0 })
  return { db: { rpc } as unknown as GithubDatabase, rpc }
}
describe('explicit repository selection', () => {
  it('lists repositories without connecting them and annotates current/project usage', async () => {
    const { db, rpc } = setup()
    rpc.mockResolvedValueOnce({ data: { connected_ids: [10], in_use_ids: [10] }, error: null })
    const result = await prepareRepositorySelection(db, 'user', 'account.state', 'code')
    expect(result).toMatchObject({
      status: 'repositories',
      state: expect.stringMatching(/^selection\./),
      repositories: [
        { id: 10, connected: true, inUse: true },
        { id: 11, connected: false, inUse: false },
        { id: 12, connected: false, inUse: false },
      ],
    })
    expect(rpc.mock.calls.map(([action]) => action)).toEqual([
      'consume_github_account_connection',
      'begin_github_repository_selection',
    ])
    expect(JSON.stringify([rpc.mock.calls, result])).not.toContain('fixture-token')
  })
  it('persists explicit IDs in rotated state before a fresh authorization', async () => {
    const { db, rpc } = setup()
    const result = await selectRepositories(db, 'user', 'selection.state', [11])
    expect(result.url).toContain('state=repositories.')
    expect(rpc).toHaveBeenCalledExactlyOnceWith(
      'select_github_repositories',
      expect.objectContaining({ repository_ids: [11] }),
    )
    expect(exchangeCode).not.toHaveBeenCalled()
  })
  it('revalidates access and writes only selected repositories, passing the reviewed prior set', async () => {
    const { db, rpc } = setup()
    rpc.mockResolvedValueOnce({ data: 1, error: null })
    await expect(completeRepositorySelection(db, 'user', 'state', 'code')).resolves.toMatchObject({
      repositoryCount: 1,
    })
    expect(accountRepositories).toHaveBeenCalledExactlyOnceWith('fixture-token', 20)
    expect(rpc.mock.calls[1]).toEqual([
      'save_github_repository_selection',
      {
        requester: 'user',
        target_workspace: workspaceId,
        target_installation: 20,
        repositories: [repositories[1]],
        previous_ids: [10, 12],
      },
    ])
  })
  it('refuses the whole operation when selected access was revoked', async () => {
    const { db, rpc } = setup()
    vi.mocked(accountRepositories).mockResolvedValue({
      repositories: [repositories[0], repositories[2]],
      accountLogin: 'org',
      skippedCount: 1,
    })
    await expect(completeRepositorySelection(db, 'user', 'state', 'code')).rejects.toMatchObject({
      code: 'GITHUB_SELECTION_CHANGED',
    })
    expect(rpc).toHaveBeenCalledTimes(1)
  })
  it('reports a repository assigned to a project during selection without claiming success', async () => {
    const { db, rpc } = setup()
    rpc.mockResolvedValueOnce({ data: null, error: { code: '55000' } })
    await expect(completeRepositorySelection(db, 'user', 'state', 'code')).rejects.toMatchObject({
      code: 'GITHUB_REPOSITORY_IN_USE',
    })
  })
  it.each(['22023', '42501'])('refuses expired/foreign state or lost workspace role (%s)', async (code) => {
    const { db, rpc } = setup()
    rpc.mockReset().mockResolvedValue({ data: null, error: { code } })
    const expected = code === '22023' ? 'GITHUB_STATE_INVALID' : code
    await expect(prepareRepositorySelection(db, 'user', 'state', 'code')).rejects.toMatchObject({ code: expected })
    await expect(selectRepositories(db, 'user', 'state', [11])).rejects.toMatchObject({ code: expected })
    await expect(completeRepositorySelection(db, 'user', 'state', 'code')).rejects.toMatchObject({ code: expected })
    expect(exchangeCode).not.toHaveBeenCalled()
  })
  it.each([[], [10, 10], [-1], [Number.MAX_SAFE_INTEGER + 1]])('rejects malformed selections %j', (repositoryIds) => {
    expect(
      requestSchema.safeParse({ action: 'select-repositories', state: 's'.repeat(64), repositoryIds }).success,
    ).toBe(false)
  })
})
