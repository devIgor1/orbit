import { useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useSearchParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompaniesPage } from '@/pages/companies-page'
import { fetchCompanies } from '@/features/companies/services/company-service'
import { acceptInvitation, fetchMyInvitations } from '@/features/companies/services/invitation-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testAuth } from './test-providers'

vi.mock('@/features/companies/services/company-service', () => ({
  createCompany: vi.fn(), fetchCompanies: vi.fn(), selectCompany: vi.fn(),
}))
vi.mock('@/features/companies/services/invitation-service', () => ({
  fetchMyInvitations: vi.fn(), acceptInvitation: vi.fn(),
}))

const linkedId = 'c0900000-0000-4000-8000-000000000001'
const otherId = 'c0900000-0000-4000-8000-000000000002'
const invitation = {
  id: otherId, workspace_name: 'Outra empresa', email: 'atual@example.test',
  expires_at: '2026-10-16T12:00:00Z',
}
const destination = `/companies?invitation=${linkedId}`

function LoginDestination() {
  const [params] = useSearchParams()
  return <output aria-label="Destino após login">{params.get('next')}</output>
}

function renderFlow(signOut = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)) {
  const client = createTestClient()
  function Flow() {
    const [user, setUser] = useState(testAuth.user)
    return (
      <TestProviders client={client} initialEntries={[destination]} auth={{
        ...testAuth,
        user: user ? { ...user, email: invitation.email } : null,
        signOut: async () => { await signOut(); setUser(null) },
      }}>
        <Routes>
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/login" element={<LoginDestination />} />
          <Route path="/dashboard" element={<h1>Empresa aberta</h1>} />
        </Routes>
      </TestProviders>
    )
  }
  render(<Flow />)
  return { signOut, client }
}

beforeEach(() => {
  vi.mocked(fetchCompanies).mockReset().mockResolvedValue([])
  vi.mocked(fetchMyInvitations).mockReset().mockResolvedValue([invitation])
  vi.mocked(acceptInvitation).mockReset()
})

describe('Conta ao abrir um convite por e-mail', () => {
  it('identifica a conta atual e preserva o link ao trocar de conta sem aceitar outro convite', async () => {
    const { signOut } = renderFlow()
    const user = userEvent.setup()
    expect(await screen.findByRole('alert')).toHaveTextContent(invitation.email)
    expect(screen.getByText('Outros convites disponíveis para esta conta:')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aceitar convite de Outra empresa' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Entrar com outra conta' }))
    expect(await screen.findByLabelText('Destino após login')).toHaveTextContent(destination)
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(acceptInvitation).not.toHaveBeenCalled()
  })

  it('preserva a sessão e permite tentar novamente quando a saída falha', async () => {
    const signOut = vi.fn<() => Promise<void>>().mockRejectedValue(new AppError('network', 'Não foi possível sair.'))
    renderFlow(signOut)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Entrar com outra conta' }))
    expect(await screen.findByText('Não foi possível sair.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Entrar com outra conta' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Aceitar convite de Outra empresa' })).toBeVisible()
    expect(screen.queryByLabelText('Destino após login')).not.toBeInTheDocument()
  })

  it('não transforma uma falha da consulta em aviso de conta incorreta', async () => {
    vi.mocked(fetchMyInvitations).mockRejectedValue(new AppError('network', 'Convites indisponíveis.'))
    renderFlow()
    expect(await screen.findByRole('alert')).toHaveTextContent('Convites indisponíveis.')
    expect(screen.queryByRole('button', { name: 'Entrar com outra conta' })).not.toBeInTheDocument()
  })

  it('abre um convite válido sem piscar um aviso quando ele sai da lista de pendentes', async () => {
    vi.mocked(fetchMyInvitations).mockResolvedValueOnce([{ ...invitation, id: linkedId }]).mockResolvedValue([])
    vi.mocked(acceptInvitation).mockResolvedValue('c0900000-0000-4000-8000-000000000003')
    let finishRefresh: (value: Awaited<ReturnType<typeof fetchCompanies>>) => void = () => {}
    const refresh = new Promise<Awaited<ReturnType<typeof fetchCompanies>>>((resolve) => { finishRefresh = resolve })
    vi.mocked(fetchCompanies).mockResolvedValueOnce([]).mockReturnValue(refresh)
    const { client } = renderFlow()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Aceitar convite de Outra empresa' }))
    await waitFor(() => expect(client.getQueryData(['my-invitations', testAuth.user?.id])).toEqual([]))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await act(async () => { finishRefresh([]); await refresh })
    expect(await screen.findByRole('heading', { name: 'Empresa aberta' })).toBeVisible()
    expect(acceptInvitation).toHaveBeenCalledExactlyOnceWith(linkedId)
  })
})
