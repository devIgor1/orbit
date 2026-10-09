import { beforeEach, expect, it, vi } from 'vitest'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { inviteCollaboratorWithEmail, sendInvitationEmail } from '@/features/companies/services/invitation-email-service'

const { invoke, rpc } = vi.hoisted(() => ({ invoke: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ functions: { invoke }, rpc }) }))
const id = 'e0900000-0000-4000-8000-000000000001'
beforeEach(() => { invoke.mockReset(); rpc.mockReset() })
it('só confirma o envio do convite solicitado', async () => {
  invoke.mockResolvedValue({ data: { id, status: 'sent' }, error: null })
  await expect(sendInvitationEmail(id)).resolves.toEqual({ id, status: 'sent' })
  invoke.mockResolvedValue({ data: { id: 'e0900000-0000-4000-8000-000000000002', status: 'sent' }, error: null })
  await expect(sendInvitationEmail(id)).rejects.toThrow(/não confirmou/)
})
it('explica criação parcial sem afirmar que o email foi enviado', async () => {
  rpc.mockResolvedValue({ data: { id, workspace_id: id, email: 'person@example.test', status: 'pending' }, error: null })
  invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(Response.json({ code: 'EMAIL_SEND_FAILED' }, { status: 502 })) })
  await expect(inviteCollaboratorWithEmail(id, 'person@example.test')).rejects.toThrow(/convite foi criado, mas/)
})
it('informa o limite de reenvio sem esconder a recusa', async () => {
  invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(Response.json({ code: 'EMAIL_RATE_LIMIT' }, { status: 429 })) })
  await expect(sendInvitationEmail(id)).rejects.toThrow(/um minuto/)
})
it('não chama o envio quando o banco recusa a criação', async () => {
  rpc.mockResolvedValue({ data: null, error: { code: '42501' } })
  await expect(inviteCollaboratorWithEmail(id, 'person@example.test')).rejects.toThrow(/permissão/)
  expect(invoke).not.toHaveBeenCalled()
})
