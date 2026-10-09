import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMemberDetails, fetchMemberEvents, manageMember } from '@/features/team/services/member-management-service'

const backend = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => backend }))
const workspace = 'e0900000-0000-4000-8000-000000000010'
const member = 'e0900000-0000-4000-8000-000000000002'
const event = { id: 'e0900000-0000-4000-8000-000000000050', workspace_id: workspace,
  actor_id: 'e0900000-0000-4000-8000-000000000001', actor_name: 'Ana', member_id: member, member_name: 'Bruno',
  action: 'role_changed', previous_role: 'member', new_role: 'admin', reassigned_to: null, reassigned_name: null,
  affected_tasks: 0, created_at: '2026-10-09T12:00:00Z' }
const change = { memberId: member, expectedRole: 'member' as const, action: 'role' as const, role: 'admin' as const }
beforeEach(() => vi.clearAllMocks())

describe('Contratos da gestão de membros', () => {
  it('exige um evento persistido correspondente ao pedido', async () => {
    for (const data of [null, { ...event, member_id: event.actor_id }, { ...event, workspace_id: event.actor_id }, { ...event, new_role: 'member' }]) {
      backend.rpc.mockResolvedValueOnce({ data, error: null })
      await expect(manageMember(workspace, change)).rejects.toMatchObject({ kind: 'contract' })
    }
    backend.rpc.mockResolvedValueOnce({ data: event, error: null })
    await expect(manageMember(workspace, change)).resolves.toEqual(event)
  })
  it('confere a quantidade e o destino das tarefas removidas', async () => {
    const request = { memberId: member, expectedRole: 'member' as const, action: 'remove' as const, pendingTasks: 2, replacement: null }
    backend.rpc.mockResolvedValueOnce({ data: { ...event, action: 'removed', new_role: null, affected_tasks: 1 }, error: null })
    await expect(manageMember(workspace, request)).rejects.toMatchObject({ kind: 'contract' })
    backend.rpc.mockResolvedValueOnce({ data: { ...event, action: 'removed', new_role: null, affected_tasks: 2 }, error: null })
    await expect(manageMember(workspace, request)).resolves.toMatchObject({ affected_tasks: 2 })
  })
  it.each([
    ['PT412', 'administrador'], ['PT409', 'mudaram'], ['PT404', 'não faz mais parte'],
    ['42501', 'permissão'], ['40P01', 'Outra alteração'],
  ])('traduz recusa %s sem confirmar sucesso', async (code, text) => {
    backend.rpc.mockResolvedValueOnce({ data: null, error: { code } })
    await expect(manageMember(workspace, change)).rejects.toThrow(text)
  })
  it('não troca uma pessoa por outra no resumo de remoção', async () => {
    backend.rpc.mockReturnValueOnce({ single: async () => ({ data: { user_id: event.actor_id, full_name: 'Ana', role: 'admin', pending_tasks: 0, is_last_admin: true }, error: null }) })
    await expect(fetchMemberDetails(workspace, member)).rejects.toMatchObject({ kind: 'contract' })
  })
  it('diferencia histórico vazio, resposta inválida e erro', async () => {
    const range = vi.fn()
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range }
    backend.from.mockReturnValue(query)
    range.mockResolvedValueOnce({ data: [], count: 0, error: null })
    await expect(fetchMemberEvents(workspace, 0)).resolves.toEqual({ events: [], total: 0 })
    range.mockResolvedValueOnce({ data: [], count: null, error: null })
    await expect(fetchMemberEvents(workspace, 0)).rejects.toMatchObject({ kind: 'contract' })
    range.mockResolvedValueOnce({ data: null, count: null, error: { code: '42501' } })
    await expect(fetchMemberEvents(workspace, 0)).rejects.toMatchObject({ kind: 'permission' })
  })
})
