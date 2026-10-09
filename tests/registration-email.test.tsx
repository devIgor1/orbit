import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignupForm } from '@/features/auth/components/signup-form'
import { signUp } from '@/features/auth/services/signup-service'
import { checkRegistrationEmail, resendRegistrationConfirmation } from '@/features/auth/services/registration-email-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testAuth } from './test-providers'

vi.mock('@/features/auth/services/signup-service', () => ({ signUp: vi.fn() }))
vi.mock('@/features/auth/services/registration-email-service', () => ({ checkRegistrationEmail: vi.fn(), resendRegistrationConfirmation: vi.fn() }))
beforeEach(() => {
  vi.mocked(checkRegistrationEmail).mockReset().mockResolvedValue('available')
  vi.mocked(resendRegistrationConfirmation).mockReset().mockResolvedValue()
  vi.mocked(signUp).mockReset()
})
function setup() {
  render(<TestProviders client={createTestClient()} auth={{ ...testAuth, user: null }}>
    <SignupForm destination="/companies?invitation=invite-1" />
  </TestProviders>)
  return userEvent.setup()
}
describe('Verificação do e-mail durante o cadastro', () => {
  it('não consulta endereços incompletos', async () => {
    const user = setup()
    await user.type(screen.getByLabelText('E-mail'), 'incompleto@')
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)) })
    expect(checkRegistrationEmail).not.toHaveBeenCalled()
  })
  it('avisa após a pausa, normaliza o e-mail e oferece login sem enviar cadastro', async () => {
    vi.mocked(checkRegistrationEmail).mockResolvedValue('registered')
    const user = setup()
    await user.type(screen.getByLabelText('E-mail'), 'PESSOA@EXAMPLE.TEST')
    expect(checkRegistrationEmail).not.toHaveBeenCalled()
    expect(screen.getByText('Verificando e-mail…')).toBeVisible()
    expect(await screen.findByText(/Este e-mail já está cadastrado/)).toBeVisible()
    expect(checkRegistrationEmail).toHaveBeenCalledTimes(1)
    expect(checkRegistrationEmail).toHaveBeenCalledWith('pessoa@example.test', expect.any(AbortSignal))
    expect(screen.getByRole('link', { name: 'Entrar na minha conta' })).toHaveAttribute('href', '/login?next=%2Fcompanies%3Finvitation%3Dinvite-1')
    expect(screen.getByRole('button', { name: 'Criar minha conta' })).toBeDisabled()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(signUp).not.toHaveBeenCalled()
  })
  it('ignora a resposta antiga se a pessoa trocar o endereço', async () => {
    let finish!: (value: 'registered') => void
    vi.mocked(checkRegistrationEmail).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const user = setup()
    await user.type(screen.getByLabelText('E-mail'), 'old@example.test')
    await waitFor(() => expect(checkRegistrationEmail).toHaveBeenCalledTimes(1))
    await user.clear(screen.getByLabelText('E-mail'))
    await user.type(screen.getByLabelText('E-mail'), 'new@example.test')
    await waitFor(() => expect(checkRegistrationEmail).toHaveBeenCalledTimes(2))
    await act(async () => finish('registered'))
    expect(screen.queryByText(/já está cadastrado/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar minha conta' })).toBeEnabled()
  })
  it('falha de consulta fica visível e oferece nova tentativa', async () => {
    vi.mocked(checkRegistrationEmail).mockRejectedValueOnce(new AppError('network', 'Falha de conexão.')).mockResolvedValue('registered')
    const user = setup()
    await user.type(screen.getByLabelText('E-mail'), 'pessoa@example.test')
    expect(await screen.findByText(/Não foi possível verificar este e-mail/)).toBeVisible()
    expect(screen.getByLabelText('E-mail')).toHaveValue('pessoa@example.test')
    await user.click(screen.getByRole('button', { name: 'Verificar novamente' }))
    expect(await screen.findByText(/já está cadastrado/)).toBeVisible()
  })
  it('permite reenviar confirmação pendente preservando o convite e sem recriar a conta', async () => {
    vi.mocked(checkRegistrationEmail).mockResolvedValue('confirmation_pending')
    const user = setup()
    await user.type(screen.getByLabelText('E-mail'), 'pending@example.test')
    await user.click(await screen.findByRole('button', { name: 'Reenviar confirmação' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Solicitação recebida')
    expect(resendRegistrationConfirmation).toHaveBeenCalledWith('pending@example.test', '/companies?invitation=invite-1')
    expect(screen.getByRole('button', { name: 'Criar minha conta' })).toBeDisabled()
    expect(signUp).not.toHaveBeenCalled()
  })
  it('mostra erro de reenvio sem afirmar que o e-mail foi enviado', async () => {
    vi.mocked(checkRegistrationEmail).mockResolvedValue('confirmation_pending')
    vi.mocked(resendRegistrationConfirmation).mockRejectedValue(new AppError('network', 'Aguarde um minuto.'))
    const user = setup()
    await user.type(screen.getByLabelText('E-mail'), 'pending@example.test')
    await user.click(await screen.findByRole('button', { name: 'Reenviar confirmação' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Aguarde um minuto')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
