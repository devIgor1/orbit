import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from '@/pages/settings-page'
import { fetchWorkspace } from '@/features/workspace/workspace-service'
import { updateProfile } from '@/features/team/services/team-service'
import { fetchInvitations } from '@/features/companies/services/invitation-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testAuth, testProfile, testWorkspace } from './test-providers'

vi.mock('@/features/workspace/workspace-service', () => ({ fetchWorkspace: vi.fn() }))
vi.mock('@/features/team/services/team-service', () => ({ updateProfile: vi.fn() }))
vi.mock('@/features/companies/services/invitation-service', () => ({
  fetchInvitations: vi.fn(),
  inviteCollaborator: vi.fn(),
  revokeInvitation: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(fetchWorkspace).mockReset().mockResolvedValue(testWorkspace)
  vi.mocked(updateProfile).mockReset()
  vi.mocked(fetchInvitations).mockReset().mockResolvedValue([])
})

function setup() {
  const client = createTestClient()
  render(
    <TestProviders client={client} auth={{ ...testAuth, user: { ...testAuth.user!, email: 'pessoa@exemplo.test' } }}>
      <SettingsPage />
    </TestProviders>,
  )
  return { client, user: userEvent.setup() }
}

describe('Configurações orientadas à conta e à empresa', () => {
  it('carrega dados antes de oferecer ações e permite ao administrador consultar convites', async () => {
    const { user } = setup()
    expect(screen.getByRole('status')).toHaveTextContent('Preparando suas configurações')
    expect(screen.queryByRole('button', { name: 'Editar perfil' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: testProfile.full_name })).toBeVisible()
    expect(screen.getByText('pessoa@exemplo.test')).toBeVisible()
    expect(screen.getByRole('link', { name: /Suas empresas/ })).toHaveAttribute('href', '/companies')
    expect(screen.getByRole('link', { name: /Conhecer a equipe/ })).toHaveAttribute('href', '/team')
    await user.click(screen.getByRole('button', { name: 'Gerenciar convites' }))
    const dialog = screen.getByRole('dialog', { name: 'Equipe e convites' })
    expect(await within(dialog).findByText('Nenhum convite pendente')).toBeVisible()
    expect(fetchInvitations).toHaveBeenCalledWith(testWorkspace.workspace.id)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gerenciar convites' })).toHaveFocus())
  })

  it('mostra o acesso de membro sem oferecer gestão de convites', async () => {
    vi.mocked(fetchWorkspace).mockResolvedValue({ ...testWorkspace, role: 'member' })
    setup()
    expect(await screen.findByText('Membro')).toBeVisible()
    expect(screen.getByText(/fale com um administrador/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Gerenciar convites' })).not.toBeInTheDocument()
    expect(fetchInvitations).not.toHaveBeenCalled()
  })

  it('oculta dados antigos quando a atualização da empresa falha', async () => {
    const { client } = setup()
    expect(await screen.findByRole('heading', { name: testWorkspace.workspace.name })).toBeVisible()
    vi.mocked(fetchWorkspace).mockRejectedValue(new AppError('network', 'Servidor indisponível.'))
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['workspace'] })
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor indisponível.')
    expect(screen.queryByRole('heading', { name: testWorkspace.workspace.name })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar perfil' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })

  it('mantém a edição recusada aberta e só confirma o perfil após sucesso do servidor', async () => {
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'Editar perfil' }))
    await user.clear(screen.getByLabelText('Nome completo'))
    await user.type(screen.getByLabelText('Nome completo'), 'Nome atualizado')
    vi.mocked(updateProfile).mockRejectedValueOnce(new AppError('permission', 'Alteração recusada.'))
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Alteração recusada.')
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Nome atualizado')
    expect(screen.queryByText('Seu perfil foi atualizado.')).not.toBeInTheDocument()

    const updated = { ...testProfile, full_name: 'Nome atualizado' }
    vi.mocked(updateProfile).mockResolvedValueOnce(updated)
    vi.mocked(fetchWorkspace).mockResolvedValue({ ...testWorkspace, profile: updated })
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Seu perfil foi atualizado.')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nome atualizado' })).toBeVisible()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar perfil' })).toHaveFocus())
  })
})
