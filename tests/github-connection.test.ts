// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { completeConnection } from '../supabase/functions/github-api/connection'
import type { GithubDatabase } from '../supabase/functions/_shared/github/database'
import type * as GithubClient from '../supabase/functions/_shared/github/client'

vi.mock('../supabase/functions/_shared/github/client',async importOriginal => {
  const actual = await importOriginal<typeof GithubClient>()
  return { ...actual,appToken: async () => 'fixture-app-token' }
})
afterEach(() => vi.unstubAllGlobals())
const workspaceId = 'aa000000-0000-4000-8000-000000000001'
const repositoryId = 'aa000000-0000-4000-8000-000000000002'
function setup(permission = 'admin') {
  const rpc = vi.fn().mockResolvedValueOnce({ data: { workspace_id: workspaceId,repository_name: 'org/repo' },error: null })
    .mockResolvedValueOnce({ data: repositoryId,error: null })
  // A deliberately narrow database double; production uses the generated client.
  const db = { rpc } as unknown as GithubDatabase
  const secrets: Record<string,string> = { GITHUB_CLIENT_ID: 'client',GITHUB_CLIENT_SECRET: 'fixture',ORBIT_APP_URL: 'https://orbit.example.test' }
  vi.stubGlobal('Deno',{ env: { get: (name: string) => secrets[name] } })
  const fetcher = vi.fn()
    .mockResolvedValueOnce(Response.json({ access_token: 'fixture-user-token' }))
    .mockResolvedValueOnce(Response.json({ id: 10,full_name: 'org/repo',default_branch: 'main',private: true }))
    .mockResolvedValueOnce(Response.json({ id: 5,login: 'owner' }))
    .mockResolvedValueOnce(Response.json({ permission,user: { id: 5 } }))
    .mockResolvedValueOnce(Response.json({ id: 20,suspended_at: null }))
  vi.stubGlobal('fetch',fetcher)
  return { db,rpc,fetcher }
}
describe('GitHub connection authority',() => {
  it('connects only after OAuth, user permission and App installation are confirmed',async () => {
    const { db,rpc,fetcher } = setup()
    expect(await completeConnection(db,'orbit-user','state-value','code-value')).toEqual({ id: repositoryId,workspaceId })
    expect(rpc.mock.calls[0][0]).toBe('consume_github_connection')
    expect(rpc.mock.calls[0][1].state_hash).not.toBe('state-value')
    expect(fetcher.mock.calls[3][0]).toContain('/collaborators/owner/permission')
    expect(fetcher.mock.calls[4][1].headers.Authorization).toBe('Bearer fixture-app-token')
    expect(rpc.mock.calls[1]).toEqual(['finish_github_connection',expect.objectContaining({ requester: 'orbit-user',target_workspace: workspaceId,
      repository: expect.objectContaining({ id: 10,installation_id: 20 }) })])
  })
  it('refuses read-only GitHub users even if they know a repository name',async () => {
    const { db,rpc } = setup('read')
    await expect(completeConnection(db,'orbit-user','state-value','code-value')).rejects.toMatchObject({ code: 'GITHUB_ADMIN_REQUIRED' })
    expect(rpc).toHaveBeenCalledTimes(1)
  })
  it('does not exchange the OAuth code when its state has expired or belongs to another user',async () => {
    const { db,rpc,fetcher } = setup()
    rpc.mockReset().mockResolvedValue({ data: null,error: { code: '22023' } })
    await expect(completeConnection(db,'orbit-user','state-value','code-value')).rejects.toMatchObject({ code: '22023' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
