import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OnboardingPage } from '@/pages/onboarding-page'
import { fetchWorkspace } from '@/features/workspace/workspace-service'
import { createCompany } from '@/features/companies/services/company-service'
import { fetchInvitations } from '@/features/companies/services/invitation-service'
import { inviteCollaboratorWithEmail } from '@/features/companies/services/invitation-email-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testWorkspace } from './test-providers'

vi.mock('@/features/workspace/workspace-service', () => ({ fetchWorkspace: vi.fn() }))
vi.mock('@/features/companies/services/company-service', () => ({ createCompany: vi.fn() }))
vi.mock('@/features/companies/services/invitation-service', () => ({
  fetchInvitations: vi.fn(), inviteCollaborator: vi.fn(), revokeInvitation: vi.fn(),
}))
vi.mock('@/features/companies/services/invitation-email-service', () => ({
  inviteCollaboratorWithEmail: vi.fn(), sendInvitationEmail: vi.fn(),
}))

function setup() {
  render(
    <TestProviders client={createTestClient()} initialEntries={['/onboarding']}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard" element={<h1>Workspace aberto</h1>} />
      </Routes>
    </TestProviders>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.mocked(fetchWorkspace).mockReset().mockRejectedValue(new AppError('onboarding', 'Cadastre sua empresa.'))
  vi.mocked(createCompany).mockReset()
  vi.mocked(fetchInvitations).mockReset().mockResolvedValue([])
  vi.mocked(inviteCollaboratorWithEmail).mockReset()
})

describe('Onboarding de empresa e equipe', () => {
  it('avança somente após a empresa ser criada e o workspace confirmado pelo backend', async () => {
    let confirmCreation: (value: typeof testWorkspace.workspace) => void = () => {}
    vi.mocked(createCompany).mockReturnValue(new Promise((resolve) => { confirmCreation = resolve }))
    const user = setup()
    await user.type(await screen.findByLabelText('Nome da empresa'), 'Estúdio de teste')
    await user.click(screen.getByRole('button', { name: 'Cadastrar empresa' }))
    expect(screen.getByRole('button', { name: 'Aguarde…' })).toBeDisabled()
    expect(screen.queryByLabelText('E-mail do colaborador')).not.toBeInTheDocument()
    vi.mocked(fetchWorkspace).mockResolvedValue(testWorkspace)
    await act(async () => confirmCreation(testWorkspace.workspace))
    expect(await screen.findByRole('heading', { name: 'Crie junto com sua equipe.' })).toHaveFocus()
    expect(screen.getByText(testWorkspace.workspace.name)).toBeVisible()
    expect(createCompany).toHaveBeenCalledExactlyOnceWith('Estúdio de teste', expect.anything())
  })
  it('preserva o nome e a primeira etapa quando a criação é recusada', async () => {
    vi.mocked(createCompany).mockRejectedValue(new AppError('network', 'Criação não confirmada.'))
    const user = setup()
    await user.type(await screen.findByLabelText('Nome da empresa'), 'Meu estúdio')
    await user.click(screen.getByRole('button', { name: 'Cadastrar empresa' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Criação não confirmada.')
    expect(screen.getByLabelText('Nome da empresa')).toHaveValue('Meu estúdio')
    expect(screen.queryByLabelText('E-mail do colaborador')).not.toBeInTheDocument()
  })
  it('mostra falha de consulta sem sugerir criar outra empresa', async () => {
    vi.mocked(fetchWorkspace).mockRejectedValue(new AppError('network', 'Servidor indisponível.'))
    setup()
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor indisponível.')
    expect(screen.queryByLabelText('Nome da empresa')).not.toBeInTheDocument()
  })
  it('retoma a etapa de equipe usando a empresa persistida e permite convidar depois', async () => {
    vi.mocked(fetchWorkspace).mockResolvedValue(testWorkspace)
    const user = setup()
    expect(await screen.findByRole('heading', { name: 'Crie junto com sua equipe.' })).toBeVisible()
    expect(screen.queryByLabelText('Nome da empresa')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ir para o workspace' }))
    expect(await screen.findByRole('heading', { name: 'Workspace aberto' })).toBeVisible()
    expect(createCompany).not.toHaveBeenCalled()
  })
  it('aguarda o envio do convite e mantém o e-mail em caso de falha', async () => {
    vi.mocked(fetchWorkspace).mockResolvedValue(testWorkspace)
    let rejectInvite: (error: Error) => void = () => {}
    vi.mocked(inviteCollaboratorWithEmail).mockReturnValue(new Promise((_resolve, reject) => { rejectInvite = reject }))
    const user = setup()
    await user.type(await screen.findByLabelText('E-mail do colaborador'), 'equipe@example.test')
    await user.click(screen.getByRole('button', { name: 'Enviar convite', exact: true }))
    expect(screen.getByRole('button', { name: 'Ir para o workspace' })).toBeDisabled()
    await act(async () => rejectInvite(new AppError('network', 'Não foi possível enviar o convite.')))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar')
    expect(screen.getByLabelText('E-mail do colaborador')).toHaveValue('equipe@example.test')
    expect(screen.getByRole('button', { name: 'Ir para o workspace' })).toBeEnabled()
  })
  it('não exige que um colaborador de empresa crie outra empresa', async () => {
    vi.mocked(fetchWorkspace).mockResolvedValue({ ...testWorkspace, role: 'member' })
    setup()
    expect(await screen.findByRole('heading', { name: 'Workspace aberto' })).toBeVisible()
    expect(screen.queryByLabelText('Nome da empresa')).not.toBeInTheDocument()
  })
})
