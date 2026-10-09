import { z } from 'zod'

export const requestSchema = z.object({ invitationId: z.uuid() }).strict()
export const deliverySchema = z.object({
  id: z.uuid(),
  invitation_id: z.uuid(),
  recipient: z.email(),
  inviter_name: z.string().min(1),
  reply_to: z.email(),
  company_name: z.string().min(1),
  sender_email: z.email(),
  invitation_url: z.url(),
  expires_at: z.iso.datetime({ offset: true }),
})
export type InvitationDelivery = z.infer<typeof deliverySchema>

export class DeliveryError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code)
  }
}
