import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/supabase/database.generated.ts'
import { deliverySchema, DeliveryError } from './contracts.ts'
import { createInvitationEmailHandler } from './handler.ts'
import { sendWithResend } from './resend.ts'

function required(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new DeliveryError('EMAIL_NOT_CONFIGURED', 503)
  return value
}

function databaseFailure(code: string) {
  if (code === '42501') return new DeliveryError('FORBIDDEN', 403)
  if (code === 'PT410') return new DeliveryError('INVITATION_UNAVAILABLE', 409)
  if (code === 'PT429') return new DeliveryError('EMAIL_RATE_LIMIT', 429)
  return new DeliveryError('EMAIL_STATE_UNKNOWN', 503)
}

const admin = () => createClient<Database>(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(createInvitationEmailHandler({
  async authenticate(authorization) {
    const { data, error } = await admin().auth.getUser(authorization.slice(7))
    if (error && (!error.status || error.status >= 500)) throw new DeliveryError('EMAIL_STATE_UNKNOWN', 503)
    if (error || !data.user) throw new DeliveryError('AUTH_REQUIRED', 401)
    return data.user.id
  },
  async prepare(invitationId, userId) {
    // Fail before reserving if the provider configuration is incomplete.
    required('RESEND_API_KEY')
    const appUrl = new URL(required('ORBIT_APP_URL'))
    if (appUrl.protocol !== 'https:' && !(appUrl.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(appUrl.hostname)))
      throw new DeliveryError('EMAIL_NOT_CONFIGURED', 503)
    const { data, error } = await admin().rpc('prepare_invitation_email', {
      invitation_id: invitationId,
      requester_id: userId,
      application_url: appUrl.origin,
      from_email: required('ORBIT_SMTP_SENDER_EMAIL'),
    })
    if (error) throw databaseFailure(error.code)
    const result = deliverySchema.safeParse(data)
    if (!result.success) throw new DeliveryError('EMAIL_STATE_UNKNOWN', 503)
    return result.data
  },
  send: (job) => sendWithResend(job, required('RESEND_API_KEY')),
  async finish(job, providerId) {
    const { data, error } = await admin().rpc('finish_invitation_email', {
      delivery_id: job.id, ...(providerId ? { message_id: providerId } : {}),
    })
    if (error || data !== job.invitation_id) throw new DeliveryError('EMAIL_STATE_UNKNOWN', 503)
  },
}))
