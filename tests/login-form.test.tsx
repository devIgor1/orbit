import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from '@/features/auth/components/login-form'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testAuth } from './test-providers'

describe('Acesso ao workspace', () => {
  it('preserva as credenciais digitadas quando o servidor recusa o login', async () => {
    const signIn = vi.fn().mockRejectedValue(new AppError('authentication', 'E-mail ou senha incorretos.'))
    const user = userEvent.setup()
    render(<TestProviders client={createTestClient()} auth={{ ...testAuth, user: null, signIn }}><LoginForm /></TestProviders>)
    await user.type(screen.getByLabelText('E-mail'), 'pessoa@teste.com')
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'senha-incorreta')
    await user.click(screen.getByRole('button', { name: /Entrar no workspace/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
    expect(screen.getByLabelText('E-mail')).toHaveValue('pessoa@teste.com')
    expect(screen.getByLabelText('Senha', { exact: true })).toHaveValue('senha-incorreta')
    expect(signIn).toHaveBeenCalledExactlyOnceWith('pessoa@teste.com', 'senha-incorreta')
  })

  it('valida campos antes de chamar a autenticação', async () => {
    const signIn = vi.fn()
    const user = userEvent.setup()
    render(<TestProviders client={createTestClient()} auth={{ ...testAuth, signIn }}><LoginForm /></TestProviders>)
    await user.click(screen.getByRole('button', { name: /Entrar no workspace/ }))
    expect(await screen.findByText('Informe um e-mail válido.')).toBeVisible()
    expect(screen.getByText('Informe sua senha.')).toBeVisible()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('impede envio duplicado enquanto a autenticação aguarda resposta', async () => {
    const signIn = vi.fn(() => new Promise<void>(() => {}))
    const user = userEvent.setup()
    render(<TestProviders client={createTestClient()} auth={{ ...testAuth, signIn }}><LoginForm /></TestProviders>)
    await user.type(screen.getByLabelText('E-mail'), 'pessoa@teste.com')
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'senha')
    await user.click(screen.getByRole('button', { name: /Entrar no workspace/ }))
    expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeDisabled()
    expect(signIn).toHaveBeenCalledTimes(1)
  })

  it('explica a conexão ausente e bloqueia login sem backend', () => {
    render(<TestProviders client={createTestClient()} auth={{ ...testAuth, configured: false }}><LoginForm /></TestProviders>)
    expect(screen.getByRole('button', { name: /Entrar no workspace/ })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Configurar conexão' })).toHaveAttribute('href', '/settings')
  })
})
