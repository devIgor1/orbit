import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompaniesPage } from '@/pages/companies-page'
import { createCompany, fetchCompanies } from '@/features/companies/services/company-service'
import { fetchMyInvitations } from '@/features/companies/services/invitation-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders } from './test-providers'

vi.mock('@/features/companies/services/company-service', () => ({
  createCompany: vi.fn(),
  fetchCompanies: vi.fn(),
  selectCompany: vi.fn(),
}))
vi.mock('@/features/companies/services/invitation-service', () => ({
  fetchMyInvitations: vi.fn(),
  acceptInvitation: vi.fn(),
}))
beforeEach(() => {
  vi.mocked(fetchCompanies).mockReset().mockResolvedValue([])
  vi.mocked(fetchMyInvitations).mockReset().mockResolvedValue([])
  vi.mocked(createCompany).mockReset()
})

describe('Entrada na empresa', () => {
  it('permite cadastrar a primeira empresa após resposta vazia confirmada', async () => {
    render(
      <TestProviders client={createTestClient()}>
        <CompaniesPage />
      </TestProviders>,
    )
    expect(await screen.findByText('Seu espaço começa aqui')).toBeVisible()
    expect(screen.getByLabelText('Nome da empresa')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('mostra falha de consulta sem fingir que não existem empresas', async () => {
    vi.mocked(fetchCompanies).mockRejectedValue(new AppError('network', 'Servidor indisponível.'))
    render(
      <TestProviders client={createTestClient()}>
        <CompaniesPage />
      </TestProviders>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor indisponível.')
    expect(screen.queryByText('Seu espaço começa aqui')).not.toBeInTheDocument()
  })
  it('preserva o nome da empresa quando o cadastro falha', async () => {
    vi.mocked(createCompany).mockRejectedValue(new AppError('permission', 'Cadastro recusado.'))
    render(
      <TestProviders client={createTestClient()}>
        <CompaniesPage />
      </TestProviders>,
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Nome da empresa'), 'Meu estúdio')
    await user.click(screen.getByRole('button', { name: 'Cadastrar empresa' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cadastro recusado.')
    expect(screen.getByLabelText('Nome da empresa')).toHaveValue('Meu estúdio')
  })
})
