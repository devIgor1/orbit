import type { InvitationDelivery } from '../../supabase/functions/send-invitation/contracts.ts'

// Test/visual-review data only; never used by the application or deployed function.
export const invitationDelivery: InvitationDelivery = {
  id: 'e0900000-0000-4000-8000-000000000010',
  invitation_id: 'e0900000-0000-4000-8000-000000000020',
  recipient: 'marina@example.test',
  inviter_name: 'Igor Santos',
  reply_to: 'igor@example.test',
  company_name: 'Estúdio Aurora',
  sender_email: 'access@orbit.test',
  invitation_url: 'https://orbit-ashen-six.vercel.app/companies?invitation=e0900000-0000-4000-8000-000000000020',
  expires_at: '2026-10-20T12:00:00Z',
  template_version: 2,
}
