import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject, fetchProjects, updateProject } from '@/features/projects/services/projects-service'

const backend = vi.hoisted(() => {
  const response: { data: unknown; error: unknown; count: number | null } = { data: [], error: null, count: 0 }
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    single: vi.fn(async () => response),
    then: (resolve: (result: typeof response) => unknown) => Promise.resolve(response).then(resolve),
  }
  return { response, query, from: vi.fn(() => query) }
})

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ from: backend.from }) }))

beforeEach(() => {
  backend.response.data = []
  backend.response.error = null
  backend.response.count = 0
  vi.clearAllMocks()
})

describe('Contrato de projetos', () => {
  it('aceita zero somente quando o backend confirma a listagem vazia', async () => {
    await expect(fetchProjects('workspace-1', {})).resolves.toEqual({ items: [], total: 0 })
  })

  it('propaga indisponibilidade em vez de transformar erro em lista vazia', async () => {
    backend.response.error = new TypeError('Failed to fetch')
    backend.response.data = null
    await expect(fetchProjects('workspace-1', {})).rejects.toMatchObject({ kind: 'network' })
  })

  it('rejeita listagens sem contagem confirmada', async () => {
    backend.response.count = null
    await expect(fetchProjects('workspace-1', {})).rejects.toMatchObject({ kind: 'contract' })
  })

  it('trata zero registros afetados como falha de autorização', async () => {
    backend.response.data = null
    backend.response.error = { code: 'PGRST116' }
    await expect(updateProject('workspace-1', { id: 'project-1', title: 'Revisado' })).rejects.toMatchObject({ kind: 'permission' })
    expect(backend.query.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1')
  })

  it('não confirma criação quando RLS recusa a operação', async () => {
    backend.response.data = null
    backend.response.error = { code: '42501' }
    await expect(createProject('workspace-1', 'user-1', { title: 'Novo projeto' })).rejects.toMatchObject({ kind: 'permission' })
  })

  it('rejeita sucesso HTTP sem um registro efetivamente afetado', async () => {
    backend.response.data = null
    await expect(createProject('workspace-1', 'user-1', { title: 'Novo projeto' })).rejects.toMatchObject({ kind: 'contract' })
  })
})
