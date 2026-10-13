// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listTaskReferences } from '../supabase/functions/github-api/references'
import { linkTask } from '../supabase/functions/github-api/link'
import { requestSchema } from '../supabase/functions/_shared/github/contracts'
import type { GithubDatabase } from '../supabase/functions/_shared/github/database'
import type * as GithubClient from '../supabase/functions/_shared/github/client'

const authentication = vi.hoisted(() => ({ installationToken: vi.fn() }))
vi.mock('../supabase/functions/_shared/github/client', async (importOriginal) => ({
  ...(await importOriginal<typeof GithubClient>()),
  installationToken: authentication.installationToken,
}))
beforeEach(() => authentication.installationToken.mockReset().mockResolvedValue('fixture-repository-token'))
afterEach(() => vi.unstubAllGlobals())
const input = {
  action: 'references' as const,
  workspaceId: 'workspace',
  taskId: 'task',
  repositoryId: 'repo',
  kind: 'branch' as const,
  page: 1,
  state: 'open' as const,
}
const current = { id: 10, full_name: 'org/repo', default_branch: 'trunk', private: true }
const pull = {
  number: 42,
  title: 'Login',
  state: 'open',
  draft: false,
  merged_at: null,
  closed_at: null,
  head: { ref: 'feat/login', repo: { id: 99, full_name: 'contributor/fork' } },
  base: { ref: 'trunk', repo: { id: 10 } },
}

function setup(results: unknown = [{ name: 'trunk' }, { name: 'feat/login' }]) {
  const rows: Record<string, Record<string, unknown>[]> = {
    workspace_members: [{ workspace_id: 'workspace', user_id: 'user', role: 'member', removed_at: null }],
    tasks: [{ workspace_id: 'workspace', id: 'task', project_id: 'project' }],
    github_repositories: [
      {
        workspace_id: 'workspace',
        id: 'repo',
        github_id: 10,
        installation_id: 20,
        full_name: 'org/repo',
        default_branch: 'main',
        active: true,
      },
    ],
  }
  // Narrow relational double: equality filters actually restrict the returned row.
  const from = vi.fn((table: string) => {
    const filters: Array<[string, unknown]> = []
    const find = () => rows[table].find((row) => filters.every(([key, value]) => row[key] === value))
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        filters.push([key, value])
        return query
      },
      is: (key: string, value: unknown) => {
        filters.push([key, value])
        return query
      },
      maybeSingle: async () => ({ data: find() ?? null, error: null }),
      single: async () => ({ data: find() ?? null, error: find() ? null : { code: 'PGRST116' } }),
    }
    return query
  })
  const rpc = vi.fn().mockResolvedValue({ data: 'link-id', error: null })
  const db = { from, rpc } as unknown as GithubDatabase
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json(current)).mockResolvedValueOnce(Response.json(results))
  vi.stubGlobal('fetch', fetcher)
  return { db, rows, fetcher, rpc }
}

describe('Task GitHub references', () => {
  it('links a PR directly to a task without a project repository association', async () => {
    const { db, rpc } = setup(pull)
    await expect(linkTask(db, 'user', { ...input, action: 'link', prNumber: 42 })).resolves.toEqual({ id: 'link-id' })
    expect(db.from).not.toHaveBeenCalledWith('project_github_repositories')
    expect(rpc).toHaveBeenCalledWith(
      'link_task_github',
      expect.objectContaining({
        target_task: 'task',
        target_repository: 'repo',
        development: expect.objectContaining({ branch: 'feat/login', head_repository_id: 99, pr_number: 42 }),
      }),
    )
  })
  it('lists work branches with a read-only repository token and excludes the current default', async () => {
    const { db, fetcher } = setup()
    expect(await listTaskReferences(db, 'user', input)).toEqual({
      kind: 'branch',
      items: [{ name: 'feat/login' }],
      nextPage: null,
    })
    expect(authentication.installationToken).toHaveBeenCalledWith(20, 10, 'read')
    expect(fetcher.mock.calls[1][0]).toBe('https://api.github.com/repos/org/repo/branches?per_page=50&page=1')
  })
  it('keeps pagination available for a full page even after excluding the default branch', async () => {
    const { db } = setup([{ name: 'trunk' }, ...Array.from({ length: 49 }, (_, i) => ({ name: `feat/${i}` }))])
    const result = await listTaskReferences(db, 'user', input)
    expect(result.items).toHaveLength(49)
    expect(result.nextPage).toBe(2)
  })
  it('returns an explicit successful empty response when there are no work branches', async () => {
    const { db } = setup([{ name: 'trunk' }])
    expect(await listTaskReferences(db, 'user', input)).toEqual({ kind: 'branch', items: [], nextPage: null })
  })
  it('lists PR statuses, source/target branches and forks with the requested filter and page', async () => {
    const { db, fetcher } = setup([
      pull,
      { ...pull, number: 43, draft: true },
      { ...pull, number: 44, state: 'closed' },
      { ...pull, number: 45, state: 'closed', merged_at: '2026-10-12T00:00:00Z' },
      { ...pull, number: 46, head: { ref: 'deleted', repo: null } },
    ])
    const result = await listTaskReferences(db, 'user', { ...input, kind: 'pr', state: 'all', page: 2 })
    expect(result).toMatchObject({
      kind: 'pr',
      nextPage: null,
      items: [
        { number: 42, branch: 'feat/login', baseBranch: 'trunk', headRepository: 'contributor/fork', state: 'open' },
        { number: 43, state: 'draft' },
        { number: 44, state: 'closed' },
        { number: 45, state: 'merged' },
        { number: 46, headRepository: null },
      ],
    })
    expect(fetcher.mock.calls[1][0]).toContain('state=all&sort=updated&direction=desc&per_page=50&page=2')
  })
  it.each([
    'different-user',
    'removed-member',
    'different-workspace',
    'different-task',
    'different-repository',
    'inactive-repository',
  ])('refuses %s before making a GitHub request', async (scenario) => {
    const { db, rows, fetcher } = setup()
    const request = { ...input }
    let user = 'user'
    if (scenario === 'different-user') user = 'outsider'
    if (scenario === 'removed-member') rows.workspace_members[0].removed_at = '2026-10-12'
    if (scenario === 'different-workspace') request.workspaceId = 'foreign'
    if (scenario === 'different-task') request.taskId = 'foreign'
    if (scenario === 'different-repository') request.repositoryId = 'foreign'
    if (scenario === 'inactive-repository') rows.github_repositories[0].active = false
    await expect(listTaskReferences(db, user, request)).rejects.toHaveProperty('code')
    await expect(linkTask(db, user, { ...request, action: 'link', prNumber: 42 })).rejects.toHaveProperty('code')
    expect(authentication.installationToken).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('does not turn a failed GitHub query into an empty list', async () => {
    const { db, fetcher } = setup()
    fetcher
      .mockReset()
      .mockResolvedValueOnce(Response.json(current))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(listTaskReferences(db, 'user', input)).rejects.toMatchObject({ code: 'GITHUB_UNAVAILABLE' })
  })
  it('rejects mismatched repositories and malformed remote contracts', async () => {
    const { db, fetcher } = setup([{ ...pull, base: { ...pull.base, repo: { id: 999 } } }])
    await expect(listTaskReferences(db, 'user', { ...input, kind: 'pr' })).rejects.toMatchObject({
      code: 'GITHUB_CONTRACT',
    })
    fetcher
      .mockReset()
      .mockResolvedValueOnce(Response.json(current))
      .mockResolvedValueOnce(Response.json({ success: true }))
    await expect(listTaskReferences(db, 'user', input)).rejects.toMatchObject({ code: 'GITHUB_CONTRACT' })
  })
  it('revalidates a selected branch before writing if it was deleted after loading', async () => {
    const { db, fetcher, rpc } = setup()
    fetcher
      .mockReset()
      .mockResolvedValueOnce(Response.json(current))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
    await expect(
      linkTask(db, 'user', {
        action: 'link',
        workspaceId: 'workspace',
        taskId: 'task',
        repositoryId: 'repo',
        branch: 'feat/deleted',
      }),
    ).rejects.toMatchObject({ code: 'GITHUB_UNAVAILABLE' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it('validates pagination and filters at the HTTP contract boundary', () => {
    const valid = {
      ...input,
      workspaceId: 'aa000000-0000-4000-8000-000000000001',
      taskId: 'aa000000-0000-4000-8000-000000000002',
      repositoryId: 'aa000000-0000-4000-8000-000000000003',
    }
    expect(requestSchema.safeParse(valid).success).toBe(true)
    expect(requestSchema.safeParse({ ...valid, page: 0 }).success).toBe(false)
    expect(requestSchema.safeParse({ ...valid, state: 'merged' }).success).toBe(false)
  })
  it('revalidates the live default branch when linking, including a default changed since connection', async () => {
    const { db, fetcher, rpc } = setup()
    await expect(linkTask(db, 'user', { ...input, action: 'link', branch: 'trunk' })).rejects.toMatchObject({
      code: 'GITHUB_BRANCH_REQUIRED',
    })
    expect(rpc).not.toHaveBeenCalled()
    fetcher
      .mockReset()
      .mockResolvedValueOnce(Response.json(current))
      .mockResolvedValueOnce(Response.json({ name: 'main' }))
    await expect(linkTask(db, 'user', { ...input, action: 'link', branch: 'main' })).resolves.toEqual({ id: 'link-id' })
  })
})
