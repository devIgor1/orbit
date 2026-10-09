import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamPage } from '@/pages/team-page'
import { fetchWorkspace } from '@/features/workspace/workspace-service'
import { fetchTeam } from '@/features/team/services/team-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testWorkspace } from './test-providers'

vi.mock('@/features/workspace/workspace-service', () => ({ fetchWorkspace: vi.fn() }))
vi.mock('@/features/team/services/team-service', () => ({ fetchTeam: vi.fn(), updateProfile: vi.fn() }))

beforeEach(() => {
  vi.mocked(fetchWorkspace).mockReset().mockResolvedValue(testWorkspace)
  vi.mocked(fetchTeam).mockReset()
})

describe('Estados reais do diretório', () => {
  it('apresenta vazio somente depois de uma consulta confirmada sem membros', async () => {
    vi.mocked(fetchTeam).mockResolvedValue([])
    render(<TestProviders client={createTestClient()}><TeamPage /></TestProviders>)
    expect(await screen.findByRole('heading', { name: 'Sua equipe começa aqui' })).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('apresenta erro de permissão sem substituí-lo pelo estado vazio', async () => {
    vi.mocked(fetchTeam).mockRejectedValue(new AppError('permission', 'Você não tem permissão para realizar esta ação.'))
    render(<TestProviders client={createTestClient()}><TeamPage /></TestProviders>)
    expect(await screen.findByRole('alert')).toHaveTextContent(/permissão/)
    expect(screen.queryByText('Sua equipe começa aqui')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })

  it('não exibe dados antigos como atuais quando a atualização falha', async () => {
    vi.mocked(fetchTeam).mockResolvedValueOnce([{ ...testWorkspace.profile, role: 'member', assigned_tasks: 3, completed_tasks: 1, is_active: true }])
    const client = createTestClient()
    render(<TestProviders client={client}><TeamPage /></TestProviders>)
    expect(await screen.findByRole('heading', { name: /Pessoa de teste/ })).toBeVisible()
    vi.mocked(fetchTeam).mockRejectedValue(new AppError('network', 'Não foi possível conectar ao servidor.'))
    await act(async () => { await client.invalidateQueries({ queryKey: ['team'] }) })
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
    expect(screen.queryByRole('heading', { name: /Pessoa de teste/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Sua equipe começa aqui')).not.toBeInTheDocument()
  })

  it('não mascara falha na resolução do workspace', async () => {
    vi.mocked(fetchWorkspace).mockRejectedValue(new AppError('permission', 'Sua conta não está vinculada a um workspace.'))
    render(<TestProviders client={createTestClient()}><TeamPage /></TestProviders>)
    expect(await screen.findByRole('alert')).toHaveTextContent(/não está vinculada/)
    expect(fetchTeam).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Editar meu perfil' })).toBeDisabled()
  })
})
