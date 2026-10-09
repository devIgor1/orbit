import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signUp } from '@/features/auth/services/signup-service'

const { signup } = vi.hoisted(() => ({ signup: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ auth: { signUp: signup } }) }))
beforeEach(() => {
  signup.mockReset()
})
const values = {
  fullName: 'Pessoa',
  email: 'pessoa@example.test',
  password: 'Senha-forte-123',
  confirmPassword: 'Senha-forte-123',
}
describe('Supabase signup', () => {
  it('explica os requisitos quando o servidor recusa uma senha fraca', async () => {
    signup.mockResolvedValue({ data: {}, error: { code: 'weak_password', status: 422 } })
    await expect(signUp(values, '/companies')).rejects.toThrow(
      'Use pelo menos 8 caracteres, com uma letra maiúscula, uma minúscula, um número e um caractere especial.',
    )
  })
  it('envia somente nome como metadado e mantém destino seguro da confirmação', async () => {
    signup.mockResolvedValue({ data: { user: { id: 'user' }, session: null }, error: null })
    await expect(signUp(values, '/companies?invitation=123')).resolves.toEqual({ confirmationRequired: true })
    expect(signup).toHaveBeenCalledWith({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: 'Pessoa' },
        emailRedirectTo: `${window.location.origin}/login?next=%2Fcompanies%3Finvitation%3D123`,
      },
    })
  })
  it('não aceita redirecionamento externo nem omissão do usuário', async () => {
    signup.mockResolvedValue({ data: { user: null, session: null }, error: null })
    await expect(signUp(values, '//example.com')).rejects.toThrow(/não confirmou/)
    expect(signup).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ emailRedirectTo: `${window.location.origin}/login?next=%2Fcompanies` }),
      }),
    )
  })
  it('reporta configuração de envio indisponível sem confirmar cadastro', async () => {
    signup.mockResolvedValue({ data: {}, error: { code: 'email_address_not_authorized', status: 403 } })
    await expect(signUp(values, '/companies')).rejects.toThrow(/envio de e-mails/)
  })
})
