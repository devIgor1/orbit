// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { completionComment, ensureCompletionComment } from '../supabase/functions/github-worker/comment'
import { readSnapshot } from '../supabase/functions/github-worker/snapshot'
import { pullSnapshot } from '../supabase/functions/_shared/github/contracts'

afterEach(() => vi.unstubAllGlobals())
const pull = { number: 42,title: 'Login',state: 'open' as const,draft: false,merged_at: null,closed_at: null,
  head: { ref: 'feat/login',repo: { id: 20 } },base: { repo: { id: 20 } } }
const link = { branch: 'feat/login',head_repository_id: 20,pr_number: null,created_at: '2026-10-11T11:00:00Z' }
const message = completionComment('workspace','task','project','Login @someone **ok**','https://example.test')
describe('GitHub synchronization',() => {
  it('distinguishes drafts, ready PRs, closed PRs and merges',() => {
    expect(pullSnapshot(pull,20).pr_state).toBe('open')
    expect(pullSnapshot({ ...pull,draft: true },20).pr_state).toBe('draft')
    expect(pullSnapshot({ ...pull,state: 'closed' },20).pr_state).toBe('closed')
    expect(pullSnapshot({ ...pull,state: 'closed',merged_at: '2026-10-11T12:00:00Z' },20).pr_state).toBe('merged')
    expect(() => pullSnapshot(pull,30)).toThrow()
  })
  it('discovers a merged PR even when its branch was deleted',async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json([{ ...pull,state: 'closed',merged_at: '2026-10-11T12:00:00Z',closed_at: '2026-10-11T12:00:00Z' }]))
    vi.stubGlobal('fetch',fetcher)
    expect((await readSnapshot('token','owner/repo',20,link)).pr_state).toBe('merged')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('refuses ambiguous reused branches and ignores fork branches with the same name',async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json([pull,{ ...pull,number: 43 }])))
    await expect(readSnapshot('token','owner/repo',20,link)).rejects.toMatchObject({ code: 'GITHUB_AMBIGUOUS_BRANCH' })
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json([{ ...pull,head: { ...pull.head,repo: { id: 99 } } }]))
      .mockResolvedValueOnce(Response.json({ name: 'feat/login' })))
    expect((await readSnapshot('token','owner/repo',20,link)).pr_number).toBeNull()
  })
  it('does not turn a GitHub permission failure into empty results',async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{ status: 403 })))
    await expect(readSnapshot('token','owner/repo',20,link)).rejects.toMatchObject({ code: 'GITHUB_UNAVAILABLE' })
  })
  it('does not complete new work from an old merge on a reused branch',async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json([{ ...pull,state: 'closed',merged_at: '2026-10-10T12:00:00Z',closed_at: '2026-10-10T12:00:00Z' }]))
      .mockResolvedValueOnce(Response.json({ name: 'feat/login' })))
    expect((await readSnapshot('token','owner/repo',20,link)).pr_state).toBe('branch')
  })
})
describe('Merge comments',() => {
  it('escapes task text and has a stable task marker',() => {
    expect(message.body).toContain('@\u200bsomeone')
    expect(message.body).toContain('\\*\\*ok\\*\\*')
    expect(message.body).toContain('/projects/project?task=task')
  })
  it('recovers an earlier successful POST without posting twice',async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json([{ id: 123,body: message.body,user: { login: 'orbit[bot]',type: 'Bot' } }]))
    vi.stubGlobal('fetch',fetcher)
    expect(await ensureCompletionComment('token','owner/repo',42,'orbit',message)).toBe(123)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][1].method).toBe('GET')
  })
  it('does not accept a marker forged by a user as proof of sending',async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json([{ id: 1,body: message.body,user: { login: 'someone',type: 'User' } }]))
      .mockResolvedValueOnce(Response.json({ id: 2,body: message.body,user: { login: 'orbit[bot]',type: 'Bot' } }))
    vi.stubGlobal('fetch',fetcher)
    expect(await ensureCompletionComment('token','owner/repo',42,'orbit',message)).toBe(2)
    expect(fetcher.mock.calls[1][1].method).toBe('POST')
  })
  it('propagates an uncertain POST so the worker retries through reconciliation',async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json([])).mockRejectedValueOnce(new TypeError('network')))
    await expect(ensureCompletionComment('token','owner/repo',42,'orbit',message)).rejects.toThrow('network')
  })
})
