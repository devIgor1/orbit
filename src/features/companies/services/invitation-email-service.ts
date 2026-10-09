import { FunctionsHttpError } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { inviteCollaborator } from './invitation-service'

const sentSchema = z.object({ id: z.uuid(), status: z.literal('sent') })
const failureSchema = z.object({ code: z.string() })

async function emailError(error: unknown) {
  if (!(error instanceof FunctionsHttpError)) return toAppError(error)
  let body: unknown
  try { body = await error.context.json() } catch { return toAppError({ status: error.context.status }) }
  const result = failureSchema.safeParse(body)
  if (!result.success) return toAppError({ status: error.context.status })
  switch (result.data.code) {
    case 'AUTH_REQUIRED': return toAppError({ status: 401 })
    case 'FORBIDDEN': return toAppError({ status: 403 })
    case 'EMAIL_RATE_LIMIT': return new AppError('contract', 'Aguarde pelo menos um minuto para reenviar. A empresa pode enviar até 30 convites por hora.')
    case 'INVITATION_UNAVAILABLE': return new AppError('contract', 'O convite expirou, foi cancelado ou já foi aceito. Crie um novo convite se necessário.')
    case 'EMAIL_NOT_CONFIGURED': return new AppError('configuration', 'O envio de convites por e-mail ainda não está configurado. Você pode copiar e compartilhar o link.')
    case 'EMAIL_STATE_UNKNOWN': return new AppError('network', 'Não foi possível confirmar o envio. Aguarde um minuto e tente reenviar o mesmo convite.')
    default: return new AppError('network', 'Não foi possível enviar o e-mail. Aguarde um minuto e use Reenviar e-mail ou compartilhe o link.')
  }
}

export async function sendInvitationEmail(id: string) {
  const { data, error } = await getSupabase().functions.invoke('send-invitation', { body: { invitationId: id } })
  if (error) throw await emailError(error)
  const result = sentSchema.safeParse(data)
  if (!result.success || result.data.id !== id)
    throw new AppError('contract', 'O servidor não confirmou o envio deste convite. Atualize a lista antes de tentar novamente.')
  return result.data
}

export async function inviteCollaboratorWithEmail(workspaceId: string, email: string) {
  const invitation = await inviteCollaborator(workspaceId, email)
  try {
    await sendInvitationEmail(invitation.id)
    return invitation
  } catch (error) {
    const failure = toAppError(error)
    throw new AppError(failure.kind, `O convite foi criado, mas o envio do e-mail não foi confirmado. ${failure.message}`)
  }
}
