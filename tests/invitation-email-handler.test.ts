// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInvitationEmailHandler, type InvitationEmailDependencies } from '../supabase/functions/send-invitation/handler'
import { DeliveryError } from '../supabase/functions/send-invitation/contracts'
import { invitationMessage } from '../supabase/functions/send-invitation/message'
import { sendWithResend } from '../supabase/functions/send-invitation/resend'

const job = {
  id: 'e0900000-0000-4000-8000-000000000010', invitation_id: 'e0900000-0000-4000-8000-000000000020',
  recipient: 'recipient@example.test', inviter_name: 'Igor', reply_to: 'igor@example.test',
  company_name: 'Estúdio', sender_email: 'access@orbit.test',
  invitation_url: 'https://orbit.test/companies?invitation=e0900000-0000-4000-8000-000000000020',
  expires_at: '2026-10-20T12:00:00Z',
}
const dependencies = {
  authenticate: vi.fn<InvitationEmailDependencies['authenticate']>(),
  prepare: vi.fn<InvitationEmailDependencies['prepare']>(),
  send: vi.fn<InvitationEmailDependencies['send']>(),
  finish: vi.fn<InvitationEmailDependencies['finish']>(),
}
const request = (body: object = { invitationId: job.invitation_id }, token = 'valid') => new Request('https://edge.test', {
  method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body),
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  dependencies.authenticate.mockResolvedValue('verified-user')
  dependencies.prepare.mockResolvedValue(job)
  dependencies.send.mockResolvedValue('resend-id')
  dependencies.finish.mockResolvedValue(undefined)
})
describe('Envio de convites no servidor', () => {
  it('nega chamadas anônimas antes de consultar ou enviar', async () => {
    expect((await createInvitationEmailHandler(dependencies)(request({}, ''))).status).toBe(401)
    expect(dependencies.prepare).not.toHaveBeenCalled()
    expect(dependencies.send).not.toHaveBeenCalled()
  })
  it('não aceita remetente, destinatário ou identidade fornecidos pelo navegador', async () => {
    const response = await createInvitationEmailHandler(dependencies)(request({ invitationId: job.invitation_id, requester_id: 'spoof' }))
    expect(response.status).toBe(400)
    expect(dependencies.send).not.toHaveBeenCalled()
  })
  it('não envia quando o banco recusa a permissão', async () => {
    dependencies.prepare.mockRejectedValue(new DeliveryError('FORBIDDEN', 403))
    expect((await createInvitationEmailHandler(dependencies)(request())).status).toBe(403)
    expect(dependencies.send).not.toHaveBeenCalled()
  })
  it('confirma sucesso somente após persistir o identificador do provedor', async () => {
    const response = await createInvitationEmailHandler(dependencies)(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: job.invitation_id, status: 'sent' })
    expect(dependencies.prepare).toHaveBeenCalledWith(job.invitation_id, 'verified-user')
    expect(dependencies.finish).toHaveBeenCalledWith(job, 'resend-id')
  })
  it('persiste a falha e não retorna sucesso quando o provedor recusa', async () => {
    dependencies.send.mockRejectedValue(new Error('provider-secret-detail'))
    const response = await createInvitationEmailHandler(dependencies)(request())
    expect(response.status).toBe(502)
    expect(dependencies.finish).toHaveBeenCalledWith(job, null)
    expect(await response.text()).not.toContain('provider-secret-detail')
  })
  it('não confirma envio quando não consegue persistir o resultado', async () => {
    dependencies.finish.mockRejectedValue(new Error('database details'))
    const response = await createInvitationEmailHandler(dependencies)(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'EMAIL_STATE_UNKNOWN' })
  })
  it('escapa conteúdo do usuário e identifica corretamente o responsável', () => {
    const message = invitationMessage({ ...job, company_name: '<img src=x onerror=alert(1)>', inviter_name: 'Igor\r\nBcc: victim' })
    expect(message.html).not.toContain('<img')
    expect(message.from).not.toMatch(/[\r\n]/)
    expect(message.reply_to).toBe('igor@example.test')
    expect(message.text).toContain(job.invitation_url)
    expect(message.text).toContain(job.recipient)
  })
  it('usa chave idempotente estável e rejeita sucesso sem id do provedor', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ id: 'provider-id' })).mockResolvedValueOnce(Response.json({}))
    expect(await sendWithResend(job, 'test-key', fetcher)).toBe('provider-id')
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ 'Idempotency-Key': `orbit-invitation/${job.id}` })
    await expect(sendWithResend(job, 'test-key', fetcher)).rejects.toMatchObject({ code: 'EMAIL_SEND_FAILED' })
  })
})
