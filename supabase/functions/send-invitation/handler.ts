import { DeliveryError, requestSchema, type InvitationDelivery } from './contracts.ts'

export interface InvitationEmailDependencies {
  authenticate: (authorization: string) => Promise<string>
  prepare: (invitationId: string, userId: string) => Promise<InvitationDelivery>
  send: (job: InvitationDelivery) => Promise<string>
  finish: (job: InvitationDelivery, providerId: string | null) => Promise<void>
}
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function createInvitationEmailHandler(dependencies: InvitationEmailDependencies) {
  return async (request: Request) => {
    const respond = (body: object, status = 200) => Response.json(body, { status, headers: cors })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return respond({ code: 'METHOD_NOT_ALLOWED' }, 405)
    try {
      const authorization = request.headers.get('Authorization')
      if (!authorization?.startsWith('Bearer ')) throw new DeliveryError('AUTH_REQUIRED', 401)
      const userId = await dependencies.authenticate(authorization)
      const raw = await request.text()
      if (raw.length > 1024) throw new DeliveryError('INVALID_REQUEST', 400)
      let parsed: unknown
      try { parsed = JSON.parse(raw) } catch { throw new DeliveryError('INVALID_REQUEST', 400) }
      const input = requestSchema.safeParse(parsed)
      if (!input.success) throw new DeliveryError('INVALID_REQUEST', 400)
      const job = await dependencies.prepare(input.data.invitationId, userId)
      let providerId: string
      try {
        providerId = await dependencies.send(job)
      } catch {
        await dependencies.finish(job, null)
        throw new DeliveryError('EMAIL_SEND_FAILED', 502)
      }
      await dependencies.finish(job, providerId)
      return respond({ id: job.invitation_id, status: 'sent' })
    } catch (error) {
      const failure = error instanceof DeliveryError ? error : new DeliveryError('EMAIL_STATE_UNKNOWN', 503)
      console.error('send-invitation', { code: failure.code })
      return respond({ code: failure.code }, failure.status)
    }
  }
}
