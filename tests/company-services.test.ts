import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acceptInvitation,
  fetchMyInvitations,
  inviteCollaborator,
  revokeInvitation,
} from '@/features/companies/services/invitation-service'
import { createCompany, selectCompany } from '@/features/companies/services/company-service'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ rpc }) }))
beforeEach(() => {
  rpc.mockReset()
})
const id = 'c0900000-0000-4000-8000-000000000001'

describe('Contratos de empresas e convites', () => {
  it('não confirma cadastro sem empresa retornada', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(createCompany('Empresa')).rejects.toThrow(/não confirmou/)
  })
  it('confirma a empresa selecionada e rejeita identificador divergente', async () => {
    rpc.mockResolvedValue({ data: 'c0900000-0000-4000-8000-000000000002', error: null })
    await expect(selectCompany(id)).rejects.toThrow(/não confirmou/)
  })
  it('não transforma erro de consulta em caixa de convites vazia', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } })
    await expect(fetchMyInvitations()).rejects.toThrow(/permissão/)
  })
  it('diferencia consulta vazia de contrato inválido', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ data: null, error: null })
    await expect(fetchMyInvitations()).resolves.toEqual([])
    await expect(fetchMyInvitations()).rejects.toThrow(/formato inesperado/)
  })
  it('valida o vínculo e o email do convite confirmado', async () => {
    rpc.mockResolvedValue({
      data: { id, workspace_id: 'outra-empresa', email: 'pessoa@example.test', status: 'pending' },
      error: null,
    })
    await expect(inviteCollaborator(id, 'pessoa@example.test')).rejects.toThrow(/não confirmou/)
  })
  it('não informa cancelamento para um convite ainda pendente', async () => {
    rpc.mockResolvedValue({ data: { id, status: 'pending' }, error: null })
    await expect(revokeInvitation(id)).rejects.toThrow(/não confirmou/)
  })
  it('explica convite vencido sem confirmar entrada na empresa', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PT410' } })
    await expect(acceptInvitation(id)).rejects.toThrow(/expirou/)
  })
  it('rejeita aceite sem identificador confirmado', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(acceptInvitation(id)).rejects.toThrow(/não confirmou/)
  })
})
