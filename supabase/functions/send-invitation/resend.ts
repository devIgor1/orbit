import { z } from 'zod'
import { DeliveryError, type InvitationDelivery } from './contracts.ts'
import { invitationMessage } from './message.ts'

export async function sendWithResend(job: InvitationDelivery, apiKey: string, fetcher: typeof fetch = fetch) {
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `orbit-invitation/${job.id}`,
      },
      body: JSON.stringify(invitationMessage(job)),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new DeliveryError('EMAIL_SEND_FAILED', 502)
    const result = z.object({ id: z.string().min(1) }).safeParse(await response.json())
    if (!result.success) throw new DeliveryError('EMAIL_SEND_FAILED', 502)
    return result.data.id
  } catch {
    // Never expose provider responses, addresses, or credentials in logs/errors.
    throw new DeliveryError('EMAIL_SEND_FAILED', 502)
  }
}
