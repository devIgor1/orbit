import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDashboard } from '@/features/dashboard/services/dashboard-service'
import { fetchTeam } from '@/features/team/services/team-service'
import type { DashboardSummary } from '@/lib/supabase/database.types'

const backend = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => backend }))

function emptySummary(): DashboardSummary {
  return {
    active_projects: 0, pending_tasks: 0, overdue_tasks: 0, completed_tasks: 0, total_tasks: 0,
    weekly: Array.from({ length: 7 }, (_, index) => ({ date: `2026-01-0${index + 1}`, created: 0, completed: 0 })),
    distribution: [{ status: 'todo', count: 0 }, { status: 'in_progress', count: 0 }, { status: 'review', count: 0 }, { status: 'done', count: 0 }],
  }
}

beforeEach(() => backend.rpc.mockReset())

describe('Contratos RPC', () => {
  it('aceita indicadores zerados quando os zeros são confirmados por um contrato completo', async () => {
    const summary = emptySummary()
    backend.rpc.mockResolvedValue({ data: summary, error: null })
    await expect(fetchDashboard('workspace-1', 7)).resolves.toEqual(summary)
  })

  it('rejeita distribuição com etapa ausente', async () => {
    const summary = emptySummary()
    summary.distribution = summary.distribution.filter(item => item.status !== 'review')
    backend.rpc.mockResolvedValue({ data: summary, error: null })
    await expect(fetchDashboard('workspace-1', 7)).rejects.toMatchObject({ kind: 'contract' })
  })

  it('rejeita distribuição com etapa duplicada', async () => {
    const summary = emptySummary()
    summary.distribution[3] = { status: 'todo', count: 0 }
    backend.rpc.mockResolvedValue({ data: summary, error: null })
    await expect(fetchDashboard('workspace-1', 7)).rejects.toMatchObject({ kind: 'contract' })
  })

  it('rejeita indicadores que contradizem a soma das etapas', async () => {
    backend.rpc.mockResolvedValue({ data: { ...emptySummary(), total_tasks: 4 }, error: null })
    await expect(fetchDashboard('workspace-1', 7)).rejects.toMatchObject({ kind: 'contract' })
  })

  it('não converte resposta nula da equipe em sucesso vazio', async () => {
    backend.rpc.mockResolvedValue({ data: null, error: null })
    await expect(fetchTeam('workspace-1')).rejects.toMatchObject({ kind: 'contract' })
  })

  it('aceita diretório vazio e campos opcionais explicitamente nulos', async () => {
    backend.rpc.mockResolvedValueOnce({ data: [], error: null })
    await expect(fetchTeam('workspace-1')).resolves.toEqual([])
    const member = { id: 'f4444444-4444-4444-8444-444444444444', full_name: 'Pessoa de teste', role: 'member', avatar_url: null, job_title: null, assigned_tasks: 0, completed_tasks: 0 }
    backend.rpc.mockResolvedValueOnce({ data: [member], error: null })
    await expect(fetchTeam('workspace-1')).resolves.toEqual([member])
  })
})
