import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemberAccessDialog } from '@/features/team/components/member-access-dialog'
import { MemberAccessHistory } from '@/features/team/components/member-access-history'
import { TeamPage } from '@/pages/team-page'
import { fetchWorkspace } from '@/features/workspace/workspace-service'
import { fetchTeam } from '@/features/team/services/team-service'
import { fetchMemberDetails, fetchMemberEvents, manageMember } from '@/features/team/services/member-management-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testProfile, testWorkspace } from './test-providers'

vi.mock('@/features/workspace/workspace-service', () => ({ fetchWorkspace: vi.fn() }))
vi.mock('@/features/team/services/team-service', () => ({ fetchTeam: vi.fn(), updateProfile: vi.fn() }))
vi.mock('@/features/team/services/member-management-service', () => ({ fetchMemberDetails: vi.fn(), fetchMemberEvents: vi.fn(), manageMember: vi.fn(), MEMBER_EVENTS_PAGE_SIZE: 20 }))
const id = 'e0900000-0000-4000-8000-000000000002'
const member = { ...testProfile, id, full_name: 'Bruno', role: 'member' as const, assigned_tasks: 2, completed_tasks: 1, is_active: true }
const details = { user_id: id, full_name: 'Bruno', role: 'member' as const, pending_tasks: 2, is_last_admin: false }
const event = { id: 'e0900000-0000-4000-8000-000000000050', workspace_id: testWorkspace.workspace.id, actor_id: 'user-1', actor_name: 'Admin',
  member_id: id, member_name: 'Bruno', action: 'role_changed', previous_role: 'member' as const, new_role: 'admin' as const,
  reassigned_to: null, reassigned_name: null, affected_tasks: 0, created_at: '2026-10-09T12:00:00Z' }
const onChanged = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchWorkspace).mockResolvedValue(testWorkspace)
  vi.mocked(fetchTeam).mockResolvedValue([member])
  vi.mocked(fetchMemberDetails).mockResolvedValue(details)
  vi.mocked(manageMember).mockResolvedValue(event)
  vi.mocked(fetchMemberEvents).mockResolvedValue({ events: [event], total: 1 })
})
async function open() {
  const user = userEvent.setup()
  render(<TestProviders client={createTestClient()}><MemberAccessDialog member={member} companyName="Estúdio" onChanged={onChanged} /></TestProviders>)
  await user.click(screen.getByRole('button', { name: 'Gerenciar acesso de Bruno' }))
  await screen.findByLabelText('Nível de acesso')
  return user
}
describe('Gestão de membros', () => {
  it('descreve a permissão e confirma a promoção antes de fechar', async () => {
    const user = await open()
    await user.click(screen.getByLabelText('Nível de acesso'))
    await user.click(await screen.findByRole('option', { name: 'Administrador', exact: true }))
    expect(screen.getByLabelText('Permissões do acesso escolhido')).toHaveTextContent('Gerencia projetos')
    await user.click(screen.getByRole('button', { name: 'Salvar acesso' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith('Nível de acesso atualizado.'))
    expect(manageMember).toHaveBeenCalledWith('workspace-1', { action: 'role', memberId: id, expectedRole: 'member', role: 'admin' })
  })
  it('protege o último admin em ambas as ações', async () => {
    vi.mocked(fetchMemberDetails).mockResolvedValue({ ...details, role: 'admin', is_last_admin: true })
    const user = await open()
    expect(screen.getByRole('button', { name: 'Salvar acesso' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Remover membro' }))
    expect(screen.getByRole('button', { name: 'Remover da empresa' })).toBeDisabled()
    expect(manageMember).not.toHaveBeenCalled()
  })
  it('preserva a escolha após recusa e permite atualizar o contexto', async () => {
    vi.mocked(manageMember).mockRejectedValue(new AppError('contract', 'As tarefas mudaram. Atualize os dados.'))
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Remover membro' }))
    await user.click(screen.getByRole('button', { name: 'Remover da empresa' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('As tarefas mudaram')
    expect(screen.getByLabelText('Destino das tarefas pendentes')).toHaveTextContent('Deixar sem responsável')
    expect(onChanged).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Atualizar dados' }))
    await waitFor(() => expect(fetchMemberDetails).toHaveBeenCalledTimes(2))
  })
  it('só oferece responsáveis ativos da empresa e envia a escolha confirmada', async () => {
    const replacement = { ...member, id: 'e0900000-0000-4000-8000-000000000003', full_name: 'Ana' }
    vi.mocked(fetchTeam).mockResolvedValue([member, replacement, { ...member, id: 'former', full_name: 'Ex-membro', is_active: false }])
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Remover membro' }))
    await user.click(screen.getByLabelText('Destino das tarefas pendentes'))
    expect(screen.queryByRole('option', { name: 'Bruno' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Ex-membro' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('option', { name: 'Ana' }))
    await user.click(screen.getByRole('button', { name: 'Remover da empresa' }))
    await waitFor(() => expect(manageMember).toHaveBeenCalledWith('workspace-1', { action: 'remove', memberId: id, expectedRole: 'member', pendingTasks: 2, replacement: replacement.id }))
  })
  it('não fecha nem envia novamente enquanto a remoção está pendente', async () => {
    let finish!: (value: typeof event) => void
    vi.mocked(manageMember).mockReturnValue(new Promise(resolve => { finish = resolve }))
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Remover membro' }))
    await user.click(screen.getByRole('button', { name: 'Remover da empresa' }))
    expect(screen.getByRole('button', { name: 'Removendo…' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(onChanged).not.toHaveBeenCalled()
    await act(async () => finish(event))
  })
  it('exibe erro de consulta sem abrir formulário de remoção', async () => {
    vi.mocked(fetchMemberDetails).mockRejectedValue(new AppError('network', 'Falha de conexão.'))
    const user = userEvent.setup()
    render(<TestProviders client={createTestClient()}><MemberAccessDialog member={member} companyName="Estúdio" onChanged={onChanged} /></TestProviders>)
    await user.click(screen.getByRole('button', { name: 'Gerenciar acesso de Bruno' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de conexão')
    expect(screen.queryByRole('button', { name: 'Remover da empresa' })).not.toBeInTheDocument()
  })
  it('oculta ações administrativas para colaboradores', async () => {
    vi.mocked(fetchWorkspace).mockResolvedValue({ ...testWorkspace, role: 'member' })
    render(<TestProviders client={createTestClient()}><TeamPage /></TestProviders>)
    await screen.findByRole('heading', { name: 'Bruno' })
    expect(screen.queryByRole('button', { name: /Gerenciar acesso|Histórico de acessos|Convidar colaborador/ })).not.toBeInTheDocument()
  })
  it('mostra autor, destino e data no histórico; falhas não viram vazio', async () => {
    const user = userEvent.setup()
    const client = createTestClient()
    render(<TestProviders client={client}><MemberAccessHistory /></TestProviders>)
    await user.click(screen.getByRole('button', { name: 'Histórico de acessos' }))
    expect(await screen.findByText(/alterou o acesso de/)).toHaveTextContent('Admin alterou o acesso de Bruno')
    vi.mocked(fetchMemberEvents).mockRejectedValue(new AppError('permission', 'Acesso negado.'))
    await act(async () => { await client.invalidateQueries({ queryKey: ['member-events'] }) })
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado')
    expect(screen.queryByText('Nenhuma alteração de acesso')).not.toBeInTheDocument()
  })
})
