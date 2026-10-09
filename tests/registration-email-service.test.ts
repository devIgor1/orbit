import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRegistrationEmail, resendRegistrationConfirmation } from '@/features/auth/services/registration-email-service'

const backend = vi.hoisted(() => ({ rpc: vi.fn(), resend: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ rpc: backend.rpc, auth: { resend: backend.resend } }) }))
beforeEach(() => { vi.resetAllMocks() })
describe('Consulta pública de cadastro', () => {
  it.each(['available', 'registered', 'confirmation_pending'])('confirma apenas o status real %s', async status => {
    backend.rpc.mockResolvedValue({ data: status, error: null })
    await expect(checkRegistrationEmail(' PESSOA@example.test ')).resolves.toBe(status)
    expect(backend.rpc).toHaveBeenCalledWith('check_registration_email', { candidate_email: 'pessoa@example.test' })
  })
  it('não transforma resposta inválida ou falha em disponibilidade', async () => {
    backend.rpc.mockResolvedValueOnce({ data: null, error: null })
    await expect(checkRegistrationEmail('pessoa@example.test')).rejects.toMatchObject({ kind: 'contract' })
    backend.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PT429' } })
    await expect(checkRegistrationEmail('pessoa@example.test')).rejects.toThrow('Aguarde um minuto')
    backend.rpc.mockResolvedValueOnce({ data: null, error: new TypeError('fetch failed') })
    await expect(checkRegistrationEmail('pessoa@example.test')).rejects.toMatchObject({ kind: 'network' })
  })
  it('reenvia com destino seguro e informa recusa do backend', async () => {
    backend.resend.mockResolvedValueOnce({ error: null })
    await resendRegistrationConfirmation('PESSOA@example.test', '/companies?invitation=123')
    expect(backend.resend).toHaveBeenCalledWith({ type: 'signup', email: 'pessoa@example.test', options: {
      emailRedirectTo: `${window.location.origin}/auth/confirm?next=%2Fcompanies%3Finvitation%3D123`,
    } })
    backend.resend.mockResolvedValueOnce({ error: { status: 429 } })
    await expect(resendRegistrationConfirmation('pessoa@example.test', '//evil.test')).rejects.toThrow('Aguarde um minuto')
    expect(backend.resend).toHaveBeenLastCalledWith(expect.objectContaining({ options: {
      emailRedirectTo: `${window.location.origin}/auth/confirm?next=%2Fonboarding`,
    } }))
  })
})
