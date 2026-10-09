import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignupForm } from '@/features/auth/components/signup-form'
import { signUp } from '@/features/auth/services/signup-service'
import { checkRegistrationEmail } from '@/features/auth/services/registration-email-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testAuth } from './test-providers'

vi.mock('@/features/auth/services/signup-service', () => ({ signUp: vi.fn() }))
vi.mock('@/features/auth/services/registration-email-service', () => ({ checkRegistrationEmail: vi.fn(), resendRegistrationConfirmation: vi.fn() }))
beforeEach(() => {
  vi.mocked(signUp).mockReset()
  vi.mocked(checkRegistrationEmail).mockReset().mockResolvedValue('available')
})

function renderForm() {
  render(
    <TestProviders client={createTestClient()} auth={{ ...testAuth, user: null }}>
      <SignupForm destination="/companies?invitation=invite-1" />
    </TestProviders>,
  )
}
async function fillForm() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Nome completo'), 'Pessoa Nova')
  await user.type(screen.getByLabelText('E-mail'), 'nova@example.test')
  await user.type(screen.getByLabelText('Senha', { exact: true }), 'Senha-forte-2026')
  await user.type(screen.getByLabelText('Confirmar senha'), 'Senha-forte-2026')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Criar minha conta' })).toBeEnabled())
  return user
}

describe('Cadastro público', () => {
  it('mostra os requisitos enquanto digita e impede o envio de senha incompleta', async () => {
    renderForm()
    const user = await fillForm()
    const password = screen.getByLabelText('Senha', { exact: true })
    const confirmation = screen.getByLabelText('Confirmar senha')
    const checklist = screen.getByRole('list', { name: 'Requisitos da senha' })
    expect(checklist.querySelectorAll('[data-met=true]')).toHaveLength(5)
    await user.clear(password)
    await user.clear(confirmation)
    await user.type(password, 'Senhasemnumero!')
    await user.type(confirmation, 'Senhasemnumero!')
    expect(checklist.querySelectorAll('[data-met=true]')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(await screen.findByText('Inclua pelo menos um número (0–9).')).toBeVisible()
    expect(signUp).not.toHaveBeenCalled()
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(password).toHaveValue('Senhasemnumero!')
  })

  it('valida a confirmação de senha antes de enviar', async () => {
    renderForm()
    const user = await fillForm()
    await user.type(screen.getByLabelText('Confirmar senha'), 'diferente')
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(await screen.findByText('As senhas precisam ser iguais.')).toBeVisible()
    expect(signUp).not.toHaveBeenCalled()
  })
  it('preserva o formulário quando o backend recusa o cadastro', async () => {
    vi.mocked(signUp).mockRejectedValue(new AppError('network', 'Não foi possível conectar ao servidor.'))
    renderForm()
    const user = await fillForm()
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar')
    expect(screen.getByLabelText('E-mail')).toHaveValue('nova@example.test')
    expect(screen.getByLabelText('Senha', { exact: true })).toHaveValue('Senha-forte-2026')
    expect(screen.queryByText('Confira seu e-mail')).not.toBeInTheDocument()
  })
  it('aguarda confirmação de e-mail sem perder o destino do convite', async () => {
    vi.mocked(signUp).mockResolvedValue({ confirmationRequired: true })
    renderForm()
    const user = await fillForm()
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Confira seu e-mail')
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveAttribute(
      'href',
      '/login?next=%2Fcompanies%3Finvitation%3Dinvite-1',
    )
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Pessoa Nova', email: 'nova@example.test' }),
      '/companies?invitation=invite-1',
    )
  })
  it('bloqueia o envio duplicado enquanto aguarda o servidor', async () => {
    vi.mocked(signUp).mockReturnValue(new Promise(() => {}))
    renderForm()
    const user = await fillForm()
    await user.click(screen.getByRole('button', { name: 'Criar minha conta' }))
    expect(await screen.findByRole('button', { name: 'Criando conta…' })).toBeDisabled()
    expect(signUp).toHaveBeenCalledTimes(1)
  })
})
