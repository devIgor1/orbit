import { render, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthConfirmationPage } from '@/pages/auth-confirmation-page'
import { LoginPage } from '@/pages/login-page'
import { signupDestination } from '@/features/auth/redirect-path'
import { createTestClient, TestProviders, testAuth } from './test-providers'

function renderConfirmation(path: string, auth = testAuth) {
  return render(
    <TestProviders client={createTestClient()} auth={auth} initialEntries={[path]}>
      <Routes>
        <Route path="/auth/confirm" element={<AuthConfirmationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<h1>Configurar empresa e equipe</h1>} />
        <Route path="/companies" element={<h1>Aceitar convite</h1>} />
        <Route path="/dashboard" element={<h1>Dashboard</h1>} />
      </Routes>
    </TestProviders>,
  )
}

describe('Confirmação de e-mail', () => {
  it('aguarda a sessão sem mostrar o formulário de login', () => {
    renderConfirmation('/auth/confirm?next=%2Fonboarding', { ...testAuth, loading: true, user: null })
    expect(screen.getByRole('status')).toHaveTextContent('Confirmando seu e-mail')
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
  it('leva a sessão confirmada ao onboarding sem passar pelo dashboard', async () => {
    renderConfirmation('/auth/confirm?next=%2Fonboarding')
    expect(await screen.findByRole('heading', { name: 'Configurar empresa e equipe' })).toBeVisible()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
  it('preserva o aceite da empresa para quem se cadastra por convite', async () => {
    renderConfirmation('/auth/confirm?next=%2Fcompanies%3Finvitation%3D123')
    expect(await screen.findByRole('heading', { name: 'Aceitar convite' })).toBeVisible()
  })
  it('não trata link expirado como confirmação, mesmo com sessão anterior', () => {
    renderConfirmation('/auth/confirm?next=%2Fonboarding#error=access_denied&error_code=otp_expired')
    expect(screen.getByRole('alert')).toHaveTextContent('expirou ou já foi utilizado')
    expect(screen.getByRole('link', { name: 'Entrar na minha conta' })).toHaveAttribute('href', '/login?next=%2Fonboarding')
    expect(screen.queryByText('Configurar empresa e equipe')).not.toBeInTheDocument()
  })
  it('oferece recuperação quando não há sessão confirmada e preserva o convite', () => {
    renderConfirmation('/auth/confirm?next=%2Fcompanies%3Finvitation%3D123', { ...testAuth, user: null })
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível iniciar sua sessão')
    expect(screen.getByRole('link', { name: 'Entrar na minha conta' })).toHaveAttribute('href', '/login?next=%2Fcompanies%3Finvitation%3D123')
  })
  it('suporta links de cadastro antigos que ainda retornam pelo login', async () => {
    renderConfirmation('/login?next=%2Fcompanies#type=signup')
    expect(await screen.findByRole('heading', { name: 'Configurar empresa e equipe' })).toBeVisible()
  })
  it('o login comum também aguarda a restauração antes de exibir o formulário', () => {
    renderConfirmation('/login', { ...testAuth, loading: true, user: null })
    expect(screen.getByRole('status')).toHaveTextContent('Preparando seu acesso')
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
  })
  it.each(['https://example.com', '//example.com', '/dashboard', '/companies', '/projects/123'])('não deixa o cadastro ignorar o onboarding: %s', (path) => {
    expect(signupDestination(path)).toBe('/onboarding')
  })
})
