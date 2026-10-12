import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changeTaskGithub, fetchGithubRepositories, fetchTaskGithub, linkGithubTask, setProjectGithub } from '@/features/github/services/github-service'
const backend = vi.hoisted(() => {
  const response: { data: unknown; error: unknown } = { data: null,error: null }
  const query = { select: vi.fn().mockReturnThis(),eq: vi.fn().mockReturnThis(),order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => response),then: (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve) }
  return { response,query,from: vi.fn(() => query),rpc: vi.fn(async () => response),invoke: vi.fn(async () => response) }
})
vi.mock('@/lib/supabase/client',() => ({ getSupabase: () => ({ from: backend.from,rpc: backend.rpc,functions: { invoke: backend.invoke } }) }))
beforeEach(() => { backend.response.data = null; backend.response.error = null; vi.clearAllMocks() })
describe('GitHub frontend data contracts',() => {
  it('distinguishes an empty response from an unavailable backend',async () => {
    backend.response.data = []
    await expect(fetchGithubRepositories('workspace')).resolves.toEqual([])
    backend.response.error = new TypeError('Failed to fetch')
    await expect(fetchGithubRepositories('workspace')).rejects.toMatchObject({ kind: 'network' })
  })
  it('only considers a null link empty after a successful query',async () => {
    await expect(fetchTaskGithub('workspace','task')).resolves.toBeNull()
    expect(backend.query.eq).toHaveBeenCalledWith('workspace_id','workspace')
    backend.response.error = { code: '42501' }
    await expect(fetchTaskGithub('workspace','task')).rejects.toMatchObject({ kind: 'permission' })
  })
  it('rejects zero affected rows and mismatched repository confirmations',async () => {
    await expect(changeTaskGithub('workspace','task','unlink')).rejects.toMatchObject({ kind: 'contract' })
    backend.response.data = 'aa000000-0000-4000-8000-000000000001'
    await expect(setProjectGithub('workspace','project','aa000000-0000-4000-8000-000000000002')).rejects.toMatchObject({ kind: 'contract' })
  })
  it('rejects HTTP success without a confirmed link ID',async () => {
    backend.response.data = { success: true }
    await expect(linkGithubTask('workspace','task',{ repositoryId: 'repo',branch: 'feat/login' })).rejects.toMatchObject({ kind: 'contract' })
  })
})
